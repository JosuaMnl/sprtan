import type { GeoPoint } from '../db/types'

/** Mean Earth radius in meters (WGS-84 spherical approximation). */
const EARTH_RADIUS_M = 6_371_008.8

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
  maxAccuracyM = 30,
): GeoPoint[] {
  return path.filter((p) => p.acc == null || p.acc <= maxAccuracyM)
}

/**
 * Total path length in meters. Consecutive hops shorter than `minStepM` are
 * treated as jitter and skipped — a runner standing still still produces GPS
 * wobble that would otherwise accumulate into phantom distance.
 */
export function pathDistanceM(
  path: readonly GeoPoint[],
  minStepM = 2,
): number {
  let total = 0
  for (let i = 1; i < path.length; i++) {
    const step = haversineM(path[i - 1], path[i])
    if (step >= minStepM) total += step
  }
  return total
}

/**
 * Cumulative positive elevation gain in meters. Only rises above `thresholdM`
 * between consecutive points count, to suppress altimeter noise. Returns 0 when
 * altitude data is unavailable.
 */
export function elevationGainM(
  path: readonly GeoPoint[],
  thresholdM = 1,
): number {
  let gain = 0
  let prevAlt: number | undefined
  for (const p of path) {
    if (p.alt == null) continue
    if (prevAlt != null) {
      const rise = p.alt - prevAlt
      if (rise >= thresholdM) gain += rise
    }
    prevAlt = p.alt
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
