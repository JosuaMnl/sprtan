import Dexie, { type Table } from 'dexie'
import type { Exercise, Run, SetEntry, Workout } from './types'
import { buildSeedExercises } from './seed'

export function makeId(): string {
  return crypto.randomUUID()
}

export class SprtanDB extends Dexie {
  exercises!: Table<Exercise, string>
  workouts!: Table<Workout, string>
  sets!: Table<SetEntry, string>
  runs!: Table<Run, string>

  constructor(name = 'sprtan') {
    super(name)
    this.version(1).stores({
      exercises: 'id, muscleGroup, name, isCustom',
      workouts: 'id, date, createdAt',
      sets: 'id, workoutId, exerciseId',
    })

    // v2 — add running tracker store. Additive: existing data is preserved.
    this.version(2).stores({
      runs: 'id, date, startedAt, createdAt',
    })

    // Seed the movement library the first time the DB is created.
    this.on('populate', () => {
      const now = Date.now()
      this.exercises.bulkAdd(buildSeedExercises(makeId, now))
    })
  }
}

export const db = new SprtanDB()
