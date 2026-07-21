import type { Exercise, MuscleGroup } from './types'

interface SeedExercise {
  name: string
  muscleGroup: MuscleGroup
}

/** Default movement library seeded on first launch. */
export const DEFAULT_EXERCISES: readonly SeedExercise[] = [
  { name: 'Bench Press', muscleGroup: 'chest' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'chest' },
  { name: 'Chest Fly', muscleGroup: 'chest' },
  { name: 'Deadlift', muscleGroup: 'back' },
  { name: 'Barbell Row', muscleGroup: 'back' },
  { name: 'Pull-Up', muscleGroup: 'back' },
  { name: 'Lat Pulldown', muscleGroup: 'back' },
  { name: 'Back Squat', muscleGroup: 'legs' },
  { name: 'Front Squat', muscleGroup: 'legs' },
  { name: 'Leg Press', muscleGroup: 'legs' },
  { name: 'Romanian Deadlift', muscleGroup: 'legs' },
  { name: 'Overhead Press', muscleGroup: 'shoulders' },
  { name: 'Lateral Raise', muscleGroup: 'shoulders' },
  { name: 'Barbell Curl', muscleGroup: 'arms' },
  { name: 'Triceps Pushdown', muscleGroup: 'arms' },
  { name: 'Plank', muscleGroup: 'core' },
  { name: 'Hanging Leg Raise', muscleGroup: 'core' },
] as const

export function buildSeedExercises(makeId: () => string, now: number): Exercise[] {
  return DEFAULT_EXERCISES.map((e) => ({
    id: makeId(),
    name: e.name,
    muscleGroup: e.muscleGroup,
    isCustom: false,
    createdAt: now,
  }))
}
