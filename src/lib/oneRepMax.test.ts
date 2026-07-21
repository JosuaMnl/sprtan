import { describe, expect, test } from 'vitest'
import { estimateOneRepMax, round1, setVolume } from './oneRepMax'

describe('estimateOneRepMax', () => {
  test('returns the weight itself for a single rep', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
  })

  test('applies the Epley formula for multiple reps', () => {
    // 100 * (1 + 5/30) = 116.666...
    expect(round1(estimateOneRepMax(100, 5))).toBe(116.7)
  })

  test('returns 0 for non-positive weight or reps', () => {
    expect(estimateOneRepMax(0, 5)).toBe(0)
    expect(estimateOneRepMax(100, 0)).toBe(0)
    expect(estimateOneRepMax(-50, 5)).toBe(0)
  })

  test('higher reps at same weight yield a higher estimate', () => {
    expect(estimateOneRepMax(100, 8)).toBeGreaterThan(estimateOneRepMax(100, 3))
  })
})

describe('setVolume', () => {
  test('multiplies weight by reps', () => {
    expect(setVolume(60, 10)).toBe(600)
  })

  test('returns 0 for invalid input', () => {
    expect(setVolume(0, 10)).toBe(0)
    expect(setVolume(60, 0)).toBe(0)
  })
})

describe('round1', () => {
  test('rounds to one decimal place', () => {
    expect(round1(116.6666)).toBe(116.7)
    expect(round1(100)).toBe(100)
  })
})
