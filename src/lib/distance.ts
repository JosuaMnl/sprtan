import type { WeightUnit } from './units'

/**
 * Distance/pace units piggyback on the existing kg/lbs setting: metric users
 * (kg) get km and min/km; imperial users (lbs) get miles and min/mi. Distance
 * is always stored canonically in meters, exactly like weight is stored in kg.
 */

export const METERS_PER_MILE = 1609.344

export const DISTANCE_UNIT_LABEL: Record<WeightUnit, string> = {
  kg: 'km',
  lbs: 'mi',
}

export const PACE_UNIT_LABEL: Record<WeightUnit, string> = {
  kg: '/km',
  lbs: '/mi',
}

/** Convert canonical meters into the display distance (km or miles). */
export function metersToDisplay(meters: number, unit: WeightUnit): number {
  return unit === 'lbs' ? meters / METERS_PER_MILE : meters / 1000
}

/** Format a distance (meters) as a display string, e.g. "5.42". */
export function formatDistance(meters: number, unit: WeightUnit): string {
  return metersToDisplay(meters, unit).toFixed(2)
}

/**
 * Format an elapsed duration. Uses H:MM:SS past an hour, otherwise M:SS.
 *   65_000  → "1:05"
 *   3_665_000 → "1:01:05"
 */
export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/**
 * Pace as a "M:SS" string in the user's distance unit. `secPerKm` is the
 * canonical pace from geo.paceSecPerKm; we scale it to per-mile for lbs users.
 * Returns "—" when there is no meaningful pace yet.
 */
export function formatPace(secPerKm: number, unit: WeightUnit): string {
  if (secPerKm <= 0 || !Number.isFinite(secPerKm)) return '—'
  const secPerUnit = unit === 'lbs' ? secPerKm * (METERS_PER_MILE / 1000) : secPerKm
  const total = Math.round(secPerUnit)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
