import { useCallback, useEffect, useRef, useState } from 'react'
import type { GeoPoint } from '../../db/types'
import {
  AUTO_PAUSE_AFTER_MS,
  DEFAULT_ELEVATION_THRESHOLD_M,
  DEFAULT_MAX_ACCURACY_M,
  MAX_RUN_SPEED_MPS,
  type GpsFilter,
  type PaceSample,
  evaluateStep,
  haversineM,
  prunePaceSamples,
  rollingPaceSecPerKm,
  smoothPoint,
} from '../../lib/geo'

export type RunStatus = 'idle' | 'tracking' | 'paused' | 'finished'

export interface RunTrackerState {
  status: RunStatus
  /** Smoothed, accuracy-filtered GPS track accumulated so far. */
  path: GeoPoint[]
  /** Live distance in meters. */
  distanceM: number
  /** Moving time in ms — excludes manual pauses *and* auto-paused spans. */
  elapsedMs: number
  /** Wall-clock time in ms since start, excluding manual pauses only. */
  totalElapsedMs: number
  /** ms epoch of the first accepted fix, or null before start. */
  startedAt: number | null
  /** Most recent accepted position, for map centering. */
  current: GeoPoint | null
  /** User-facing error message, or null. */
  error: string | null
  /** Horizontal accuracy of the newest fix in meters, or null. */
  accuracyM: number | null
  /** True once a fix good enough to record has arrived. */
  gpsReady: boolean
  /** True while the clock is auto-paused because the runner stopped. */
  autoPaused: boolean
}

export interface RunTracker extends RunTrackerState {
  elevationGainM: number
  /** Pace over the last ~30 s, in sec/km. 0 until the window is meaningful. */
  paceSecPerKm: number
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  reset: () => void
}

/** How often the readouts refresh. */
const TICK_MS = 500

interface GeoLocationPositionErrorLike {
  code: number
  message: string
}

function geoErrorMessage(err: GeoLocationPositionErrorLike): string {
  switch (err.code) {
    case 1:
      return 'Izin lokasi ditolak. Aktifkan akses lokasi untuk melacak lari.'
    case 2:
      return 'Sinyal GPS tidak tersedia. Coba di ruang terbuka.'
    case 3:
      return 'Pencarian sinyal GPS terlalu lama.'
    default:
      return 'Gagal membaca lokasi.'
  }
}

/** Screen Wake Lock isn't in every lib.dom yet; describe just what we use. */
interface WakeLockSentinelLike {
  released: boolean
  release: () => Promise<void>
}
interface WakeLockLike {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>
}

function wakeLockApi(): WakeLockLike | null {
  const nav = navigator as Navigator & { wakeLock?: WakeLockLike }
  return nav.wakeLock ?? null
}

/** A span of wall-clock time being accumulated across pauses. */
interface Clock {
  /** Time already banked from finished spans, in ms. */
  bankedMs: number
  /** Wall-clock start of the span in progress, or null while stopped. */
  spanStart: number | null
}

function readClock(clock: Clock, now: number): number {
  return clock.bankedMs + (clock.spanStart != null ? now - clock.spanStart : 0)
}

function bankClock(clock: Clock, until: number): void {
  if (clock.spanStart != null) {
    clock.bankedMs += Math.max(0, until - clock.spanStart)
    clock.spanStart = null
  }
}

/**
 * Tracks a run via the Geolocation API.
 *
 * Every incoming fix runs the staged pipeline documented in lib/geo.ts:
 * accuracy gate → teleport gate → Kalman smoothing → jitter floor → moving-time
 * gate. Distance is accumulated one hop at a time through the very same
 * `evaluateStep` that `pathStats` uses on the saved track, so re-deriving the
 * numbers from `path` later reproduces exactly what the runner saw live.
 *
 * Recording only happens while status is 'tracking'. The geolocation watch is
 * deliberately *kept alive* through a manual pause: dropping it makes the chip
 * lose its lock, and the first fixes after resuming are then bad enough to
 * corrupt the start of the next segment. All timers, watches and the screen
 * wake lock are released on unmount.
 */
export function useRunTracker(): RunTracker {
  const [status, setStatus] = useState<RunStatus>('idle')
  const [path, setPath] = useState<GeoPoint[]>([])
  const [distanceM, setDistanceM] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [totalElapsedMs, setTotalElapsedMs] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [current, setCurrent] = useState<GeoPoint | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accuracyM, setAccuracyM] = useState<number | null>(null)
  const [gpsReady, setGpsReady] = useState(false)
  const [autoPaused, setAutoPaused] = useState(false)
  const [elevationGain, setElevationGain] = useState(0)
  const [paceSecPerKm, setPaceSecPerKm] = useState(0)

  const watchId = useRef<number | null>(null)
  const tickId = useRef<ReturnType<typeof setInterval> | null>(null)
  const wakeLock = useRef<WakeLockSentinelLike | null>(null)

  // Recording state lives in refs: the geolocation callback must see the latest
  // values without being re-created (which would churn the watch subscription).
  const statusRef = useRef<RunStatus>('idle')
  const filterRef = useRef<GpsFilter | null>(null)
  /** Last raw (unsmoothed) fix, used for the teleport gate. */
  const lastRawRef = useRef<GeoPoint | null>(null)
  /** Last point that counted toward distance — the jitter-floor reference. */
  const anchorRef = useRef<GeoPoint | null>(null)
  const distanceRef = useRef(0)
  const paceSamplesRef = useRef<PaceSample[]>([])
  const elevationRef = useRef<{ gain: number; reference: number | null }>({
    gain: 0,
    reference: null,
  })
  /** Set while a manual pause is pending, so the next fix opens a new segment. */
  const gapPendingRef = useRef(false)
  const movingClock = useRef<Clock>({ bankedMs: 0, spanStart: null })
  const totalClock = useRef<Clock>({ bankedMs: 0, spanStart: null })
  /** Wall-clock time of the last hop that counted as real movement. */
  const lastMovementAt = useRef(0)
  const autoPausedRef = useRef(false)

  const clearWatch = useCallback(() => {
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current)
    }
    watchId.current = null
  }, [])

  const clearTick = useCallback(() => {
    if (tickId.current != null) clearInterval(tickId.current)
    tickId.current = null
  }, [])

  const releaseWakeLock = useCallback(() => {
    const lock = wakeLock.current
    wakeLock.current = null
    if (lock && !lock.released) void lock.release().catch(() => {})
  }, [])

  /**
   * Hold the screen awake while recording. On mobile a locked screen throttles
   * or suspends geolocation entirely, which shows up later as a route that
   * jumps in straight lines between the few fixes that got through.
   */
  const requestWakeLock = useCallback(async () => {
    const api = wakeLockApi()
    if (!api || wakeLock.current) return
    try {
      wakeLock.current = await api.request('screen')
    } catch {
      // Not fatal — the hint in the UI tells the user to keep the screen on.
    }
  }, [])

  // Re-acquire the wake lock when the tab comes back to the foreground; the
  // browser drops it whenever the page is hidden.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'tracking') {
        void requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [requestWakeLock])

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      clearWatch()
      clearTick()
      releaseWakeLock()
    }
  }, [clearWatch, clearTick, releaseWakeLock])

  const handlePosition = useCallback((pos: GeolocationPosition) => {
    const raw: GeoPoint = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      t: pos.timestamp,
      alt: pos.coords.altitude ?? undefined,
      acc: pos.coords.accuracy ?? undefined,
    }

    setError(null)
    setAccuracyM(raw.acc ?? null)

    // Stage 1 — accuracy gate. A 60 m fix is a cell-tower guess; recording it
    // both bends the route and inflates distance.
    if (raw.acc != null && raw.acc > DEFAULT_MAX_ACCURACY_M) return
    setGpsReady(true)

    // Stage 2 — teleport gate, applied to the *raw* fix so a bad reading never
    // reaches (and drags) the smoothing filter.
    const lastRaw = lastRawRef.current
    if (lastRaw) {
      const dtSec = (raw.t - lastRaw.t) / 1000
      if (dtSec > 0 && haversineM(lastRaw, raw) / dtSec > MAX_RUN_SPEED_MPS) return
    }
    lastRawRef.current = raw

    // Stage 3 — Kalman smoothing, weighted by the reported accuracy.
    const smoothed = smoothPoint(filterRef.current, raw)
    filterRef.current = smoothed.state

    setCurrent(smoothed.point)

    if (statusRef.current !== 'tracking') return

    // Copy rather than tag in place: `smoothed.point` is already held in state.
    const point = gapPendingRef.current
      ? { ...smoothed.point, gap: true }
      : smoothed.point
    gapPendingRef.current = false

    setPath((prev) => [...prev, point])
    setStartedAt((s) => s ?? point.t)

    // Elevation, banked with the same hysteresis `elevationGainM` applies, so
    // the live number and the stored track agree.
    if (point.alt != null) {
      const elev = elevationRef.current
      if (elev.reference == null) {
        elev.reference = point.alt
      } else if (point.alt > elev.reference + DEFAULT_ELEVATION_THRESHOLD_M) {
        elev.gain += point.alt - elev.reference
        elev.reference = point.alt
        setElevationGain(elev.gain)
      } else if (point.alt < elev.reference - DEFAULT_ELEVATION_THRESHOLD_M) {
        elev.reference = point.alt
      }
    }

    const anchor = anchorRef.current
    if (!anchor) {
      anchorRef.current = point
      paceSamplesRef.current = [{ t: point.t, distanceM: distanceRef.current }]
      return
    }

    // Stages 4 and 5 — jitter floor and moving-time gate.
    const step = evaluateStep(anchor, point)
    if (step.verdict === 'counted') {
      distanceRef.current += step.distanceM
      setDistanceM(distanceRef.current)
      anchorRef.current = point

      if (step.moving) {
        const now = Date.now()
        lastMovementAt.current = now
        // Movement after an auto-pause restarts the moving clock.
        if (autoPausedRef.current) {
          autoPausedRef.current = false
          movingClock.current.spanStart = now
          setAutoPaused(false)
        }
      }
    }

    // Sampled on every accepted fix, not only on counted hops: standing still
    // must drag the rolling window's distance down so the live pace decays to
    // "—" instead of freezing at the last running value.
    paceSamplesRef.current = prunePaceSamples([
      ...paceSamplesRef.current,
      { t: point.t, distanceM: distanceRef.current },
    ])
  }, [])

  const handleError = useCallback(
    (err: GeolocationPositionError) => {
      setError(geoErrorMessage(err))
      // PERMISSION_DENIED (1) is unrecoverable — keeping the watch and the
      // elapsed clock running would show a "tracking" UI that records nothing.
      // Halt back to idle so the user sees the error and can retry.
      if (err.code === 1) {
        clearWatch()
        clearTick()
        releaseWakeLock()
        movingClock.current.spanStart = null
        totalClock.current.spanStart = null
        statusRef.current = 'idle'
        setStatus('idle')
      }
    },
    [clearWatch, clearTick, releaseWakeLock],
  )

  const beginWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Perangkat ini tidak mendukung GPS.')
      return false
    }
    // Already watching (e.g. resuming from a pause, where we keep the lock).
    if (watchId.current != null) return true
    watchId.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      // maximumAge: 0 — a cached fix from before the run started is stale by
      // definition and would anchor the track to wherever the phone last was.
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    )
    return true
  }, [handlePosition, handleError])

  const beginTick = useCallback(() => {
    clearTick()
    tickId.current = setInterval(() => {
      const now = Date.now()

      // Auto-pause: no real displacement for a while means the runner stopped.
      // Banking only up to the last movement keeps the standing seconds out of
      // the moving time, which is what keeps average pace honest.
      if (
        statusRef.current === 'tracking' &&
        !autoPausedRef.current &&
        movingClock.current.spanStart != null &&
        now - lastMovementAt.current > AUTO_PAUSE_AFTER_MS
      ) {
        bankClock(movingClock.current, lastMovementAt.current)
        autoPausedRef.current = true
        setAutoPaused(true)
      }

      setElapsedMs(readClock(movingClock.current, now))
      setTotalElapsedMs(readClock(totalClock.current, now))
      setPaceSecPerKm(rollingPaceSecPerKm(paceSamplesRef.current))
    }, TICK_MS)
  }, [clearTick])

  const start = useCallback(() => {
    if (status !== 'idle') return
    const now = Date.now()

    setPath([])
    setDistanceM(0)
    setElapsedMs(0)
    setTotalElapsedMs(0)
    setStartedAt(null)
    setCurrent(null)
    setError(null)
    setAccuracyM(null)
    setGpsReady(false)
    setAutoPaused(false)
    setElevationGain(0)
    setPaceSecPerKm(0)

    filterRef.current = null
    lastRawRef.current = null
    anchorRef.current = null
    distanceRef.current = 0
    paceSamplesRef.current = []
    elevationRef.current = { gain: 0, reference: null }
    gapPendingRef.current = false
    autoPausedRef.current = false
    lastMovementAt.current = now
    movingClock.current = { bankedMs: 0, spanStart: now }
    totalClock.current = { bankedMs: 0, spanStart: now }

    if (beginWatch()) {
      statusRef.current = 'tracking'
      setStatus('tracking')
      beginTick()
      void requestWakeLock()
    } else {
      movingClock.current.spanStart = null
      totalClock.current.spanStart = null
    }
  }, [status, beginWatch, beginTick, requestWakeLock])

  const pause = useCallback(() => {
    const now = Date.now()
    // An auto-pause already banked the moving clock; only the wall clock is
    // still running in that case.
    bankClock(movingClock.current, now)
    bankClock(totalClock.current, now)
    setElapsedMs(movingClock.current.bankedMs)
    setTotalElapsedMs(totalClock.current.bankedMs)
    clearTick()
    releaseWakeLock()
    // Break the distance chain so the walk back to the route isn't counted as
    // one long hop, and mark the next fix as the start of a new segment.
    anchorRef.current = null
    autoPausedRef.current = false
    setAutoPaused(false)
    gapPendingRef.current = true
    statusRef.current = 'paused'
    setStatus('paused')
  }, [clearTick, releaseWakeLock])

  const resume = useCallback(() => {
    if (status !== 'paused') return
    const now = Date.now()
    lastMovementAt.current = now
    movingClock.current.spanStart = now
    totalClock.current.spanStart = now
    if (beginWatch()) {
      statusRef.current = 'tracking'
      setStatus('tracking')
      beginTick()
      void requestWakeLock()
    } else {
      movingClock.current.spanStart = null
      totalClock.current.spanStart = null
    }
  }, [status, beginWatch, beginTick, requestWakeLock])

  const stop = useCallback(() => {
    const now = Date.now()
    bankClock(movingClock.current, now)
    bankClock(totalClock.current, now)
    setElapsedMs(movingClock.current.bankedMs)
    setTotalElapsedMs(totalClock.current.bankedMs)
    clearTick()
    clearWatch()
    releaseWakeLock()
    autoPausedRef.current = false
    setAutoPaused(false)
    statusRef.current = 'finished'
    setStatus('finished')
  }, [clearTick, clearWatch, releaseWakeLock])

  const reset = useCallback(() => {
    clearTick()
    clearWatch()
    releaseWakeLock()

    filterRef.current = null
    lastRawRef.current = null
    anchorRef.current = null
    distanceRef.current = 0
    paceSamplesRef.current = []
    elevationRef.current = { gain: 0, reference: null }
    gapPendingRef.current = false
    autoPausedRef.current = false
    lastMovementAt.current = 0
    movingClock.current = { bankedMs: 0, spanStart: null }
    totalClock.current = { bankedMs: 0, spanStart: null }

    statusRef.current = 'idle'
    setStatus('idle')
    setPath([])
    setDistanceM(0)
    setElapsedMs(0)
    setTotalElapsedMs(0)
    setStartedAt(null)
    setCurrent(null)
    setError(null)
    setAccuracyM(null)
    setGpsReady(false)
    setAutoPaused(false)
    setElevationGain(0)
    setPaceSecPerKm(0)
  }, [clearTick, clearWatch, releaseWakeLock])

  return {
    status,
    path,
    distanceM,
    elapsedMs,
    totalElapsedMs,
    startedAt,
    current,
    error,
    accuracyM,
    gpsReady,
    autoPaused,
    elevationGainM: elevationGain,
    paceSecPerKm,
    start,
    pause,
    resume,
    stop,
    reset,
  }
}
