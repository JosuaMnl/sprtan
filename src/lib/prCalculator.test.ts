import { describe, expect, test } from 'vitest'
import { computeAllPRs, computePR, isNewRecord } from './prCalculator'
import type { SetEntry } from '../db/types'

function set(partial: Partial<SetEntry>): SetEntry {
  return {
    id: partial.id ?? crypto.randomUUID(),
    workoutId: partial.workoutId ?? 'w1',
    exerciseId: partial.exerciseId ?? 'e1',
    weight: partial.weight ?? 0,
    reps: partial.reps ?? 0,
    order: partial.order ?? 0,
  }
}

describe('computePR', () => {
  test('returns null when there are no valid sets', () => {
    expect(computePR('e1', [])).toBeNull()
    expect(computePR('e1', [set({ weight: 0, reps: 0 })])).toBeNull()
  })

  test('finds heaviest weight, most reps, and best estimated 1RM', () => {
    const sets = [
      set({ weight: 100, reps: 1 }), // 1RM = 100
      set({ weight: 90, reps: 5 }), // 1RM = 105
      set({ weight: 80, reps: 10 }), // 1RM ≈ 106.7
    ]
    const pr = computePR('e1', sets)!
    expect(pr.bestWeight).toBe(100)
    expect(pr.bestReps).toBe(10)
    expect(Math.round(pr.bestEst1RM)).toBe(107)
  })
})

describe('computeAllPRs', () => {
  test('groups sets by exercise', () => {
    const sets = [
      set({ exerciseId: 'a', weight: 100, reps: 1 }),
      set({ exerciseId: 'b', weight: 50, reps: 5 }),
    ]
    const prs = computeAllPRs(sets)
    expect(prs).toHaveLength(2)
    expect(prs.map((p) => p.exerciseId).sort()).toEqual(['a', 'b'])
  })
})

describe('isNewRecord', () => {
  test('true when no prior sets exist', () => {
    const candidate = set({ weight: 60, reps: 5 })
    expect(isNewRecord(candidate, [])).toBe(true)
  })

  test('true when candidate beats prior best estimated 1RM', () => {
    const prior = [set({ weight: 100, reps: 1 })] // 1RM 100
    const candidate = set({ weight: 100, reps: 3 }) // 1RM 110
    expect(isNewRecord(candidate, prior)).toBe(true)
  })

  test('false when candidate does not beat prior best', () => {
    const prior = [set({ weight: 120, reps: 1 })]
    const candidate = set({ weight: 100, reps: 2 })
    expect(isNewRecord(candidate, prior)).toBe(false)
  })

  test('false for an invalid candidate set', () => {
    expect(isNewRecord(set({ weight: 0, reps: 0 }), [])).toBe(false)
  })
})
