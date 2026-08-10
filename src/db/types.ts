export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
] as const

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Dada',
  back: 'Punggung',
  legs: 'Kaki',
  shoulders: 'Bahu',
  arms: 'Lengan',
  core: 'Inti',
}

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  isCustom: boolean
  createdAt: number
}

export interface Workout {
  id: string
  /** ISO date string, YYYY-MM-DD */
  date: string
  notes: string
  createdAt: number
}

export interface SetEntry {
  id: string
  workoutId: string
  exerciseId: string
  weight: number
  reps: number
  /** ordering within a workout+exercise block */
  order: number
}

/** A single GPS sample recorded during a run. */
export interface GeoPoint {
  lat: number
  lng: number
  /** ms epoch timestamp of the sample */
  t: number
  /** altitude in meters, if the device reported it */
  alt?: number
  /** horizontal accuracy in meters, if reported */
  acc?: number
  /**
   * Marks the first sample after a manual pause. The route is drawn as
   * separate polylines across such a break so a pause never renders as a
   * straight line cutting through the map.
   */
  gap?: boolean
}

/**
 * A recorded run. Distance is stored canonically in meters (like weight is
 * stored in kg); display units are derived per the user's unit setting.
 */
export interface Run {
  id: string
  /** ISO date string, YYYY-MM-DD (local day the run started) */
  date: string
  /** ms epoch when tracking started */
  startedAt: number
  /** elapsed moving time in ms (excludes manually paused and auto-paused spans) */
  durationMs: number
  /**
   * Wall-clock time from start to finish in ms, including auto-paused spans
   * (traffic lights, water stops). Optional — runs recorded before auto-pause
   * existed only have `durationMs`.
   */
  totalMs?: number
  /** total distance in meters */
  distanceM: number
  /** cumulative elevation gain in meters (approx, may be 0 if no altitude) */
  elevationGainM: number
  /** ordered GPS track */
  path: GeoPoint[]
  notes: string
  createdAt: number
}
