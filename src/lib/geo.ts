import type { GeoPoint } from '../db/types'

/** Mean Earth radius in meters (WGS-84 spherical approximation). */
const EARTH_RADIUS_M = 6_371_008.8

/**
 * GPS tuning constants — the single source of truth shared by the live tracker
 * (useRunTracker) and the batch helpers here, so the number shown while running
 * and the number recomputed from a stored track can never diverge.
 *
 * The pipeline is deliberately staged, in the same order a consumer GPS tracker
 * like Strava applies it:
 *
 *   1. accuracy gate   — throw away fixes the chip itself has no confidence in
 *   2. teleport gate   — throw away hops no human could have run
 *   3. Kalman smoothing — fuse each fix with the running estimate by accuracy
 *   4. jitter floor    — ignore sub-noise hops so standing still adds no meters
 *   5. moving-time gate — stop the clock when the runner effectively stops
 *
 * Skipping any one of these is what makes a naive tracker read long and fast.
 */

/** Fixes reported worse than this are discarded outright. */
export const DEFAULT_MAX_ACCURACY_M = 25
/** Absolute floor for a hop to count as real displacement. */
export const DEFAULT_MIN_STEP_M = 2
/** Share of the reported accuracy folded into the jitter floor. */
export const ACCURACY_STEP_FACTOR = 0.25
/** Ceiling on the accuracy-derived jitter floor, so a bad patch of sky can
 *  never swallow a real running stride (~3 m at 1 Hz). */
export const MAX_JITTER_FLOOR_M = 6
/** 12.5 m/s ≈ 45 km/h — above Usain Bolt's peak, so anything faster is a bad fix. */
export const MAX_RUN_SPEED_MPS = 12.5
/** Below a slow walk: the clock auto-pauses, exactly like Strava's auto-pause. */
export const MOVING_MIN_SPEED_MPS = 0.8
/** Longest gap between fixes still credited as moving time on recompute. */
export const MAX_SAMPLE_GAP_MS = 60_000
/** Stop counting moving time after this long without real displacement. */
export const AUTO_PAUSE_AFTER_MS = 8_000
/** Time/space gaps that break the drawn route into separate segments. */
export const SEGMENT_GAP_MS = 20_000
export const SEGMENT_GAP_M = 150
/** Process noise for the position filter, in m/s — roughly running speed. */
export const KALMAN_PROCESS_NOISE_MPS = 3
/** Accuracy assumed when the device reports none. */
export const ASSUMED_ACCURACY_M = 15
/** Hysteresis band for elevation gain — GPS altitude noise is ±10 m or worse. */
export const DEFAULT_ELEVATION_THRESHOLD_M = 5
/** Window and minimum distance behind the live ("current") pace readout. */
export const ROLLING_PACE_WINDOW_MS = 30_000
export const ROLLING_PACE_MIN_M = 25

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Great-circle distance between two coordinates in meters (haversine).
 * Accurate to well under 1% for the short distances a run produces.
 */
export function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Drop points whose reported accuracy is worse than `maxAccuracyM`. A GPS fix
 * with 50m accuracy adds noise that inflates distance, so we ignore it. Points
 * without an accuracy reading are kept (we can't judge them).
 */
export function filterByAccuracy(
  path: readonly GeoPoint[],
  maxAccuracyM = DEFAULT_MAX_ACCURACY_M,
): GeoPoint[] {
  return path.filter((p) => p.acc == null || p.acc <= maxAccuracyM)
}

/**
 * The smallest hop between two fixes that we are willing to believe is real
 * movement rather than noise. A 3 m fix wobbles by ~1 m; a 24 m fix wobbles by
 * much more, so the floor scales with the worse of the two accuracies — capped
 * so it never exceeds a genuine one-second stride.
 */
export function jitterFloorM(
  a: Pick<GeoPoint, 'acc'>,
  b: Pick<GeoPoint, 'acc'>,
  minStepM = DEFAULT_MIN_STEP_M,
): number {
  const acc = Math.max(a.acc ?? 0, b.acc ?? 0)
  if (acc <= 0) return minStepM
  return Math.min(MAX_JITTER_FLOOR_M, Math.max(minStepM, acc * ACCURACY_STEP_FACTOR))
}

/**
 * What a single hop between two fixes means.
 *  - `counted`  real displacement; adds distance (and moving time when fast enough)
 *  - `jitter`   below the noise floor; adds nothing and does *not* advance the
 *               anchor, so slow creep still accumulates across several fixes
 *  - `teleport` physically impossible; the fix is bad and must be dropped
 */
export type StepVerdict = 'counted' | 'jitter' | 'teleport'

export interface StepDecision {
  verdict: StepVerdict
  /** Meters this hop contributes (0 unless `counted`). */
  distanceM: number
  /** Implied speed in m/s, or 0 when the timestamps don't allow one. */
  speedMps: number
  /** True when the hop is fast enough to keep the moving clock running. */
  moving: boolean
}

export interface StepOptions {
  minStepM?: number
  maxSpeedMps?: number
  movingMinSpeedMps?: number
}

/**
 * Classify one hop. Both the live tracker and `pathStats` route every hop
 * through here, which is what guarantees the live distance and the distance
 * recomputed from the saved track agree to the meter.
 */
export function evaluateStep(
  prev: GeoPoint,
  next: GeoPoint,
  opts: StepOptions = {},
): StepDecision {
  const {
    minStepM = DEFAULT_MIN_STEP_M,
    maxSpeedMps = MAX_RUN_SPEED_MPS,
    movingMinSpeedMps = MOVING_MIN_SPEED_MPS,
  } = opts

  const step = haversineM(prev, next)
  const dtMs = next.t - prev.t
  const dtSec = dtMs > 0 ? dtMs / 1000 : 0
  const speedMps = dtSec > 0 ? step / dtSec : 0

  // A hop nobody could run is a bad fix (cell-tower fallback, tunnel exit,
  // indoor re-lock). Counting it is what adds hundreds of phantom meters and
  // draws the spike across the map.
  if (dtSec > 0 && speedMps > maxSpeedMps) {
    return { verdict: 'teleport', distanceM: 0, speedMps, moving: false }
  }

  if (step < jitterFloorM(prev, next, minStepM)) {
    return { verdict: 'jitter', distanceM: 0, speedMps, moving: false }
  }

  // Without usable timestamps we can't judge speed; assume the hop is real.
  const moving = dtSec === 0 ? true : speedMps >= movingMinSpeedMps
  return { verdict: 'counted', distanceM: step, speedMps, moving }
}

export interface PathStats {
  /** Total distance in meters. */
  distanceM: number
  /** Time spent actually moving, in ms (auto-pause applied). */
  movingMs: number
  /** Wall-clock span of the track, in ms. */
  totalMs: number
  /** Cumulative positive elevation gain in meters. */
  elevationGainM: number
  /** Fixes rejected as physically impossible. */
  teleports: number
}

export interface PathStatsOptions extends StepOptions {
  maxSampleGapMs?: number
  elevationThresholdM?: number
}

/**
 * Walk a recorded track once and derive every summary number from it. The
 * `anchor` is the last point that actually counted toward distance — hops that
 * land inside the noise floor leave it alone, so a runner creeping forward at
 * 1 m per fix still banks the distance once the accumulated drift clears the
 * floor, instead of having every sub-floor hop silently discarded.
 */
export function pathStats(
  path: readonly GeoPoint[],
  opts: PathStatsOptions = {},
): PathStats {
  const {
    maxSampleGapMs = MAX_SAMPLE_GAP_MS,
    elevationThresholdM = DEFAULT_ELEVATION_THRESHOLD_M,
    ...stepOpts
  } = opts

  let distanceM = 0
  let movingMs = 0
  let teleports = 0
  let anchor: GeoPoint | null = null
  let firstT: number | null = null
  let lastT: number | null = null

  for (const point of path) {
    if (firstT == null) firstT = point.t
    lastT = point.t

    // A pause marker restarts the chain, exactly as the live tracker does when
    // the user taps "Jeda" — whatever ground was covered while paused is not
    // part of the run.
    if (!anchor || point.gap === true) {
      anchor = point
      continue
    }

    const step = evaluateStep(anchor, point, stepOpts)
    if (step.verdict === 'teleport') {
      teleports++
      continue
    }
    if (step.verdict === 'jitter') continue

    distanceM += step.distanceM
    if (step.moving) {
      // Cap the credit for a single gap: a long blackout (backgrounded app,
      // dead battery) shouldn't silently become "moving time".
      movingMs += Math.min(Math.max(0, point.t - anchor.t), maxSampleGapMs)
    }
    anchor = point
  }

  return {
    distanceM,
    movingMs,
    totalMs: firstT != null && lastT != null ? Math.max(0, lastT - firstT) : 0,
    elevationGainM: elevationGainM(path, elevationThresholdM),
    teleports,
  }
}

/**
 * Total path length in meters. Thin wrapper over `pathStats` so there is
 * exactly one distance algorithm in the app.
 */
export function pathDistanceM(
  path: readonly GeoPoint[],
  opts: PathStatsOptions = {},
): number {
  return pathStats(path, opts).distanceM
}

/* ------------------------------------------------------------------ *
 * Position smoothing
 * ------------------------------------------------------------------ */

/**
 * One-dimensional Kalman state shared by latitude and longitude. Variance is
 * kept in meters² so it can be compared directly against the accuracy radius
 * the device reports with each fix.
 */
export interface GpsFilter {
  lat: number
  lng: number
  /** Positional variance of the current estimate, in m². */
  varianceM2: number
  /** ms epoch of the fix last fused in. */
  t: number
}

export function initGpsFilter(p: GeoPoint): GpsFilter {
  const acc = Math.max(1, p.acc ?? ASSUMED_ACCURACY_M)
  return { lat: p.lat, lng: p.lng, varianceM2: acc * acc, t: p.t }
}

/**
 * Fuse one raw fix into the running estimate.
 *
 * The gain is driven by the reported accuracy: a tight 4 m fix is trusted and
 * the estimate snaps to it, while a mushy 20 m fix barely moves the estimate.
 * That adaptivity is the whole point — it flattens the zig-zag that makes a
 * naive track look wrong on the map *and* read long, without lagging behind a
 * runner who is genuinely moving (over a straight stretch the filtered position
 * converges to the true speed, so distance is preserved).
 */
export function stepGpsFilter(
  state: GpsFilter,
  p: GeoPoint,
  processNoiseMps = KALMAN_PROCESS_NOISE_MPS,
): GpsFilter {
  const acc = Math.max(1, p.acc ?? ASSUMED_ACCURACY_M)
  const dtSec = Math.max(0, (p.t - state.t) / 1000)
  // Predict: uncertainty grows with how far the runner could have travelled.
  const predicted = state.varianceM2 + dtSec * processNoiseMps * processNoiseMps
  // Update: weight prediction against measurement by relative confidence.
  const gain = predicted / (predicted + acc * acc)
  return {
    lat: state.lat + gain * (p.lat - state.lat),
    lng: state.lng + gain * (p.lng - state.lng),
    varianceM2: (1 - gain) * predicted,
    t: p.t,
  }
}

/** Advance the filter and return the smoothed point (metadata preserved). */
export function smoothPoint(
  state: GpsFilter | null,
  p: GeoPoint,
  processNoiseMps = KALMAN_PROCESS_NOISE_MPS,
): { state: GpsFilter; point: GeoPoint } {
  const next = state ? stepGpsFilter(state, p, processNoiseMps) : initGpsFilter(p)
  return { state: next, point: { ...p, lat: next.lat, lng: next.lng } }
}

/** Batch form of `smoothPoint`, for tracks recorded before smoothing existed. */
export function smoothPath(
  path: readonly GeoPoint[],
  processNoiseMps = KALMAN_PROCESS_NOISE_MPS,
): GeoPoint[] {
  let state: GpsFilter | null = null
  const out: GeoPoint[] = []
  for (const p of path) {
    const next = smoothPoint(state, p, processNoiseMps)
    state = next.state
    out.push(next.point)
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Route rendering
 * ------------------------------------------------------------------ */

export interface SegmentOptions {
  maxGapMs?: number
  maxGapM?: number
}

/**
 * Split a track into the pieces that should be drawn as separate polylines.
 *
 * Drawing one unbroken line means a paused run — or a stretch where the signal
 * dropped — renders as a straight bar cutting across the map through buildings
 * the runner never went near. A break is taken at an explicit pause marker, at
 * a long silence, or at a jump too large to be a normal stride.
 */
export function splitSegments(
  path: readonly GeoPoint[],
  opts: SegmentOptions = {},
): GeoPoint[][] {
  const { maxGapMs = SEGMENT_GAP_MS, maxGapM = SEGMENT_GAP_M } = opts
  const segments: GeoPoint[][] = []
  let current: GeoPoint[] = []

  for (const point of path) {
    const prev = current[current.length - 1]
    if (prev) {
      const broke =
        point.gap === true ||
        point.t - prev.t > maxGapMs ||
        haversineM(prev, point) > maxGapM
      if (broke) {
        segments.push(current)
        current = []
      }
    }
    current.push(point)
  }
  if (current.length > 0) segments.push(current)
  return segments
}

/* ------------------------------------------------------------------ *
 * Derived metrics
 * ------------------------------------------------------------------ */

/**
 * Cumulative positive elevation gain in meters, using a hysteresis band rather
 * than summing every pairwise rise. GPS altitude wanders by ±10 m even while
 * standing still; summing raw rises turns a flat loop into hundreds of meters
 * of "climb". Gain is only banked once the track clears the reference by more
 * than `thresholdM`, and the reference only drops after an equally clear
 * descent. Returns 0 when altitude data is unavailable.
 */
export function elevationGainM(
  path: readonly GeoPoint[],
  thresholdM = DEFAULT_ELEVATION_THRESHOLD_M,
): number {
  let gain = 0
  let reference: number | null = null
  for (const p of path) {
    if (p.alt == null) continue
    if (reference == null) {
      reference = p.alt
      continue
    }
    if (p.alt > reference + thresholdM) {
      gain += p.alt - reference
      reference = p.alt
    } else if (p.alt < reference - thresholdM) {
      reference = p.alt
    }
  }
  return gain
}

/**
 * Pace in seconds per kilometer. Returns 0 when there is no distance or no
 * elapsed time (avoids Infinity).
 */
export function paceSecPerKm(distanceM: number, durationMs: number): number {
  if (distanceM <= 0 || durationMs <= 0) return 0
  const km = distanceM / 1000
  return durationMs / 1000 / km
}

/** Average speed in meters per second. */
export function speedMps(distanceM: number, durationMs: number): number {
  if (distanceM <= 0 || durationMs <= 0) return 0
  return distanceM / (durationMs / 1000)
}

/** A `(timestamp, cumulative distance)` reading, for rolling-window pace. */
export interface PaceSample {
  t: number
  /** Cumulative distance in meters at time `t`. */
  distanceM: number
}

/**
 * Pace over the most recent window — the "current pace" a running watch shows,
 * as opposed to the whole-run average.
 *
 * Averaging over the entire run is what makes a live pace readout feel wrong:
 * it barely moves when you speed up, and it never recovers after a slow first
 * kilometer. Looking back over a fixed window instead tracks how fast you are
 * running *now*. Returns 0 (rendered as "—") until the window holds enough
 * distance to produce a stable number.
 */
export function rollingPaceSecPerKm(
  samples: readonly PaceSample[],
  windowMs = ROLLING_PACE_WINDOW_MS,
  minDistanceM = ROLLING_PACE_MIN_M,
): number {
  const last = samples[samples.length - 1]
  if (!last || samples.length < 2) return 0

  let anchor = samples[0]
  for (let i = samples.length - 2; i >= 0; i--) {
    anchor = samples[i]
    if (
      last.t - anchor.t >= windowMs &&
      last.distanceM - anchor.distanceM >= minDistanceM
    ) {
      break
    }
  }

  const dtMs = last.t - anchor.t
  const dDistanceM = last.distanceM - anchor.distanceM
  if (dtMs <= 0 || dDistanceM < minDistanceM) return 0
  return paceSecPerKm(dDistanceM, dtMs)
}

/** Drop pace samples older than `windowMs` before the newest one. */
export function prunePaceSamples(
  samples: readonly PaceSample[],
  windowMs = ROLLING_PACE_WINDOW_MS * 3,
): PaceSample[] {
  const last = samples[samples.length - 1]
  if (!last) return []
  const cutoff = last.t - windowMs
  const keep = samples.filter((s) => s.t >= cutoff)
  // Always retain one sample before the cutoff so the window stays spannable.
  const firstKept = samples.length - keep.length
  return firstKept > 0 ? [samples[firstKept - 1], ...keep] : keep
}
