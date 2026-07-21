import { describe, expect, test } from 'vitest'
import { buildProgressSeries } from './progress'
import type { SetEntry, Workout } from '../db/types'

const workouts: Workout[] = [
  { id: 'w1', date: '2026-01-01', notes: '', createdAt: 1 },
  { id: 'w2', date: '2026-01-08', notes: '', createdAt: 2 },
]

function set(p: Partial<SetEntry>): SetEntry {
  return {
    id: p.id ?? crypto.randomUUID(),
    workoutId: p.workoutId ?? 'w1',
    exerciseId: 'e1',
    weight: p.weight ?? 0,
    reps: p.reps ?? 0,
    order: p.order ?? 0,
  }
}

describe('buildProgressSeries', () => {
  test('sorts points chronologically', () => {
    const sets = [
      set({ workoutId: 'w2', weight: 110, reps: 5 }),
      set({ workoutId: 'w1', weight: 100, reps: 5 }),
    ]
    const series = buildProgressSeries(sets, workouts, 'maxWeight')
    expect(series.map((p) => p.date)).toEqual(['2026-01-01', '2026-01-08'])
  })

  test('maxWeight takes the heaviest set of the day', () => {
    const sets = [
      set({ workoutId: 'w1', weight: 100, reps: 5 }),
      set({ workoutId: 'w1', weight: 120, reps: 2 }),
    ]
    const series = buildProgressSeries(sets, workouts, 'maxWeight')
    expect(series[0].value).toBe(120)
  })

  test('volume sums weight × reps across the day', () => {
    const sets = [
      set({ workoutId: 'w1', weight: 100, reps: 5 }), // 500
      set({ workoutId: 'w1', weight: 100, reps: 5 }), // 500
    ]
    const series = buildProgressSeries(sets, workouts, 'volume')
    expect(series[0].value).toBe(1000)
  })

  test('ignores invalid sets and unknown workouts', () => {
    const sets = [
      set({ workoutId: 'w1', weight: 0, reps: 0 }),
      set({ workoutId: 'ghost', weight: 100, reps: 5 }),
    ]
    expect(buildProgressSeries(sets, workouts, 'maxWeight')).toHaveLength(0)
  })
})
