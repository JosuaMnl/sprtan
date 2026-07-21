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
