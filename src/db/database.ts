import Dexie, { type Table, type Transaction } from 'dexie'
import type {
  Exercise,
  GeoPoint,
  RunPath,
  RunSummary,
  SetEntry,
  Workout,
} from './types'
import { buildSeedExercises } from './seed'

export function makeId(): string {
  return crypto.randomUUID()
}

/** A `runs` row as v2 stored it, with the track inline. */
type LegacyRunRow = RunSummary & { path?: GeoPoint[] }

/**
 * v3 upgrade: move each run's track out of `runs` into `runPaths`.
 *
 * Dexie runs this inside the version-change transaction, so it is all or
 * nothing: if any step fails the database stays at v2 with every run intact.
 * Rows without a `path` (none are expected) are left as they are.
 */
export async function moveRunPathsOut(tx: Transaction): Promise<void> {
  const runs = tx.table<LegacyRunRow, string>('runs')
  const paths: RunPath[] = []
  await runs.each((run) => {
    if (Array.isArray(run.path)) paths.push({ id: run.id, path: run.path })
  })
  await tx.table<RunPath, string>('runPaths').bulkPut(paths)
  await runs.toCollection().modify((run, ctx) => {
    if (!('path' in run)) return
    const { path: _path, ...summary } = run
    ctx.value = summary
  })
}

export class SprtanDB extends Dexie {
  exercises!: Table<Exercise, string>
  workouts!: Table<Workout, string>
  sets!: Table<SetEntry, string>
  runs!: Table<RunSummary, string>
  runPaths!: Table<RunPath, string>

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

    // v3 — GPS tracks move to their own store so run lists stop loading them.
    // Once a device is on v3, a build that only knows v2 can no longer open the
    // database (Dexie refuses to downgrade), so never ship a rollback past this.
    this.version(3)
      .stores({
        runPaths: 'id',
      })
      .upgrade(moveRunPathsOut)

    // Seed the movement library the first time the DB is created.
    this.on('populate', () => {
      const now = Date.now()
      this.exercises.bulkAdd(buildSeedExercises(makeId, now))
    })
  }
}

export const db = new SprtanDB()
