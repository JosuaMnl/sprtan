import { describe, expect, test } from 'vitest'
import {
  fromInputWeight,
  kgToLbs,
  lbsToKg,
  toDisplayWeight,
} from './units'

describe('kg <-> lbs conversion', () => {
  test('100 kg is ~220.5 lbs', () => {
    expect(Math.round(kgToLbs(100) * 10) / 10).toBe(220.5)
  })

  test('225 lbs is ~102.06 kg', () => {
    expect(Math.round(lbsToKg(225) * 100) / 100).toBe(102.06)
  })

  test('round-trips without drift for whole lbs', () => {
    // 100 lbs -> kg -> lbs should return exactly 100
    expect(toDisplayWeight(lbsToKg(100), 'lbs')).toBe(100)
  })
})

describe('toDisplayWeight', () => {
  test('kg mode returns the stored value rounded', () => {
    expect(toDisplayWeight(102.5, 'kg')).toBe(102.5)
  })

  test('lbs mode converts from kg', () => {
    expect(toDisplayWeight(100, 'lbs')).toBe(220.5)
  })
})

describe('fromInputWeight', () => {
  test('kg input stored as-is', () => {
    expect(fromInputWeight(100, 'kg')).toBe(100)
  })

  test('lbs input converted to kg', () => {
    expect(Math.round(fromInputWeight(220.46, 'lbs') * 10) / 10).toBe(100)
  })
})
