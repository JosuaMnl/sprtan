import { describe, expect, it } from 'vitest'
import {
  formatDistance,
  formatDuration,
  formatPace,
  metersToDisplay,
  METERS_PER_MILE,
} from './distance'

describe('metersToDisplay', () => {
  it('converts to km for kg users', () => {
    expect(metersToDisplay(5000, 'kg')).toBe(5)
  })

  it('converts to miles for lbs users', () => {
    expect(metersToDisplay(METERS_PER_MILE, 'lbs')).toBeCloseTo(1, 5)
  })
})

describe('formatDistance', () => {
  it('formats km to 2 decimals', () => {
    expect(formatDistance(5423, 'kg')).toBe('5.42')
  })

  it('formats miles for lbs users', () => {
    expect(formatDistance(METERS_PER_MILE * 3, 'lbs')).toBe('3.00')
  })
})

describe('formatDuration', () => {
  it('uses M:SS below an hour', () => {
    expect(formatDuration(65_000)).toBe('1:05')
  })

  it('uses H:MM:SS at or past an hour', () => {
    expect(formatDuration(3_665_000)).toBe('1:01:05')
  })

  it('zero-pads seconds and clamps negatives', () => {
    expect(formatDuration(9_000)).toBe('0:09')
    expect(formatDuration(-500)).toBe('0:00')
  })
})

describe('formatPace', () => {
  it('formats 300 s/km as 5:00 for kg users', () => {
    expect(formatPace(300, 'kg')).toBe('5:00')
  })

  it('scales to per-mile for lbs users', () => {
    // 300 s/km ≈ 482.8 s/mi → 8:03
    expect(formatPace(300, 'lbs')).toBe('8:03')
  })

  it('returns a dash for non-positive or infinite pace', () => {
    expect(formatPace(0, 'kg')).toBe('—')
    expect(formatPace(Infinity, 'kg')).toBe('—')
  })
})
