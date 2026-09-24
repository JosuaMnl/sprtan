import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { SprtanDB } from './database'
import { deleteRun, getRun, saveRun } from './runs'
import type { GeoPoint, Run } from './types'

const track: GeoPoint[] = [
  { lat: -6.2, lng: 106.8, t: 1000, acc: 5 },
  { lat: -6.2001, lng: 106.8001, t: 2000, acc: 5, gap: true },
]

function makeRun(id: string, path: GeoPoint[] = track): Run {
  return {
    id,
    date: '2026-09-24',
    startedAt: 1000,
    durationMs: 1000,
    totalMs: 1000,
    distanceM: 15,
    elevationGainM: 0,
    path,
    notes: '',
    createdAt: 3000,
  }
}

const opened: Dexie[] = []
let counter = 0
/** A fresh, uniquely named in-memory database (fake-indexeddb). */
function dbName(): string {
  counter += 1
  return `sprtan-test-${counter}`
}

afterEach(async () => {
  for (const d of opened.splice(0)) {
    d.close()
    await Dexie.delete(d.name)
  }
})

/** Build a database the way v2 left it: tracks stored inline on `runs`. */
async function seedV2(name: string, runs: Run[]): Promise<void> {
  const v2 = new Dexie(name)
  v2.version(1).stores({
    exercises: 'id, muscleGroup, name, isCustom',
    workouts: 'id, date, createdAt',
    sets: 'id, workoutId, exerciseId',
  })
  v2.version(2).stores({ runs: 'id, date, startedAt, createdAt' })
  await v2.table('runs').bulkAdd(runs)
  v2.close()
}

describe('v3 upgrade', () => {
  it('moves every track into runPaths and strips it from runs', async () => {
    const name = dbName()
    await seedV2(name, [makeRun('a'), makeRun('b', [track[0]])])

    const db = new SprtanDB(name)
    opened.push(db)
    const summaries = await db.runs.toArray()
    expect(summaries).toHaveLength(2)
    for (const s of summaries) expect('path' in s).toBe(false)

    expect((await db.runPaths.get('a'))?.path).toEqual(track)
    expect((await db.runPaths.get('b'))?.path).toEqual([track[0]])
  })

  it('keeps every summary field and the track intact through getRun', async () => {
    const name = dbName()
    const original = makeRun('a')
    await seedV2(name, [original])

    const db = new SprtanDB(name)
    opened.push(db)
    expect(await getRun('a', db)).toEqual(original)
  })

  it('upgrades a database with no runs', async () => {
    const name = dbName()
    await seedV2(name, [])

    const db = new SprtanDB(name)
    opened.push(db)
    expect(await db.runs.count()).toBe(0)
    expect(await db.runPaths.count()).toBe(0)
  })
})

describe('run repository', () => {
  it('saves a run across both stores and reads it back whole', async () => {
    const db = new SprtanDB(dbName())
    opened.push(db)
    const run = makeRun('x')
    await saveRun(run, db)

    expect('path' in ((await db.runs.get('x')) ?? {})).toBe(false)
    expect((await db.runPaths.get('x'))?.path).toEqual(track)
    expect(await getRun('x', db)).toEqual(run)
  })

  it('writes nothing when the save fails', async () => {
    const db = new SprtanDB(dbName())
    opened.push(db)
    await db.runPaths.add({ id: 'x', path: [] })

    await expect(saveRun(makeRun('x'), db)).rejects.toThrow()
    expect(await db.runs.get('x')).toBeUndefined()
  })

  it('deletes the summary and the track together', async () => {
    const db = new SprtanDB(dbName())
    opened.push(db)
    await saveRun(makeRun('x'), db)
    await deleteRun('x', db)

    expect(await db.runs.get('x')).toBeUndefined()
    expect(await db.runPaths.get('x')).toBeUndefined()
  })

  it('returns undefined for a run that does not exist', async () => {
    const db = new SprtanDB(dbName())
    opened.push(db)
    expect(await getRun('missing', db)).toBeUndefined()
  })

  it('returns an empty path when a summary has no stored track', async () => {
    const db = new SprtanDB(dbName())
    opened.push(db)
    const { path: _path, ...summary } = makeRun('x')
    await db.runs.add(summary)
    expect((await getRun('x', db))?.path).toEqual([])
  })
})
