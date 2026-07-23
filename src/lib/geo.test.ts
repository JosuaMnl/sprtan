import { describe, expect, it } from 'vitest'
import type { GeoPoint } from '../db/types'
import {
  elevationGainM,
  filterByAccuracy,
  haversineM,
  paceSecPerKm,
  pathDistanceM,
  speedMps,
} from './geo'

function pt(lat: number, lng: number, extra: Partial<GeoPoint> = {}): GeoPoint {
  return { lat, lng, t: 0, ...extra }
}

describe('haversineM', () => {
  it('returns 0 for identical points', () => {
    expect(haversineM(pt(-6.2, 106.8), pt(-6.2, 106.8))).toBe(0)
  })

  it('measures ~111 km per degree of latitude', () => {
    const d = haversineM(pt(0, 0), pt(1, 0))
    expect(d).toBeGreaterThan(110_000)
    expect(d).toBeLessThan(112_000)
  })

  it('matches a known Jakarta→Bandung distance (~118 km)', () => {
    const d = haversineM(pt(-6.2, 106.816), pt(-6.914, 107.61))
    // Straight-line great-circle is roughly 118 km.
    expect(d).toBeGreaterThan(115_000)
    expect(d).toBeLessThan(122_000)
  })
})

describe('pathDistanceM', () => {
  it('sums consecutive hops', () => {
    const a = pt(0, 0)
    const b = pt(0, 0.001) // ~111 m east
    const c = pt(0, 0.002)
    const total = pathDistanceM([a, b, c])
    expect(total).toBeGreaterThan(210)
    expect(total).toBeLessThan(230)
  })

  it('ignores sub-threshold jitter hops', () => {
    // Two points ~0.1 m apart (well under the 2 m floor) → treated as standing still.
    const jitter = pathDistanceM([pt(0, 0), pt(0, 0.000001)])
    expect(jitter).toBe(0)
  })

  it('returns 0 for empty or single-point paths', () => {
    expect(pathDistanceM([])).toBe(0)
    expect(pathDistanceM([pt(1, 1)])).toBe(0)
  })
})

describe('filterByAccuracy', () => {
  it('drops points worse than the threshold', () => {
    const path = [pt(0, 0, { acc: 10 }), pt(0, 1, { acc: 80 }), pt(0, 2, { acc: 5 })]
    expect(filterByAccuracy(path, 30)).toHaveLength(2)
  })

  it('keeps points that have no accuracy reading', () => {
    const path = [pt(0, 0), pt(0, 1, { acc: 100 })]
    const kept = filterByAccuracy(path, 30)
    expect(kept).toHaveLength(1)
    expect(kept[0].acc).toBeUndefined()
  })
})

describe('elevationGainM', () => {
  it('sums only positive rises above the threshold', () => {
    const path = [
      pt(0, 0, { alt: 100 }),
      pt(0, 1, { alt: 110 }), // +10
      pt(0, 2, { alt: 105 }), // descent, ignored
      pt(0, 3, { alt: 125 }), // +20
    ]
    expect(elevationGainM(path)).toBe(30)
  })

  it('returns 0 when altitude is missing', () => {
    expect(elevationGainM([pt(0, 0), pt(0, 1)])).toBe(0)
  })
})

describe('paceSecPerKm', () => {
  it('computes 5:00/km for 1 km in 300 s', () => {
    expect(paceSecPerKm(1000, 300_000)).toBe(300)
  })

  it('guards against zero distance or duration', () => {
    expect(paceSecPerKm(0, 300_000)).toBe(0)
    expect(paceSecPerKm(1000, 0)).toBe(0)
  })
})

describe('speedMps', () => {
  it('computes m/s', () => {
    expect(speedMps(1000, 100_000)).toBe(10)
  })

  it('guards against zero inputs', () => {
    expect(speedMps(0, 1000)).toBe(0)
  })
})
