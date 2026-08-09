import { describe, expect, it } from 'vitest'
import type { GeoPoint } from '../db/types'
import {
  DEFAULT_MAX_ACCURACY_M,
  elevationGainM,
  evaluateStep,
  filterByAccuracy,
  haversineM,
  jitterFloorM,
  paceSecPerKm,
  pathDistanceM,
  pathStats,
  prunePaceSamples,
  rollingPaceSecPerKm,
  smoothPath,
  speedMps,
  splitSegments,
} from './geo'

function pt(lat: number, lng: number, extra: Partial<GeoPoint> = {}): GeoPoint {
  return { lat, lng, t: 0, ...extra }
}

/** Meters per degree of longitude at the equator — handy for building tracks. */
const M_PER_DEG = 111_320

/** A point `meters` east of the origin, sampled at `t` ms. */
function east(meters: number, t: number, extra: Partial<GeoPoint> = {}): GeoPoint {
  return { lat: 0, lng: meters / M_PER_DEG, t, ...extra }
}

/** Deterministic noise in [-1, 1], so the smoothing tests never flake. */
function makeNoise(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
    return (state / 4_294_967_296) * 2 - 1
  }
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

describe('jitterFloorM', () => {
  it('falls back to the minimum step when accuracy is unknown', () => {
    expect(jitterFloorM({}, {}, 2)).toBe(2)
  })

  it('scales with the worse of the two accuracies', () => {
    expect(jitterFloorM({ acc: 4 }, { acc: 16 }, 2)).toBe(4)
  })

  it('never exceeds the cap, so a real stride always counts', () => {
    // A 25 m fix would imply a 6.25 m floor; capped at 6 m.
    expect(jitterFloorM({ acc: 25 }, { acc: 25 }, 2)).toBe(6)
  })
})

describe('evaluateStep', () => {
  it('counts a normal running stride', () => {
    const step = evaluateStep(east(0, 0, { acc: 5 }), east(3, 1000, { acc: 5 }))
    expect(step.verdict).toBe('counted')
    expect(step.distanceM).toBeCloseTo(3, 0)
    expect(step.moving).toBe(true)
  })

  it('rejects a physically impossible hop as a bad fix', () => {
    // 500 m in one second — a cell-tower fallback, not a runner.
    const step = evaluateStep(east(0, 0, { acc: 5 }), east(500, 1000, { acc: 5 }))
    expect(step.verdict).toBe('teleport')
    expect(step.distanceM).toBe(0)
  })

  it('treats sub-noise wobble as jitter', () => {
    const step = evaluateStep(east(0, 0, { acc: 8 }), east(1, 1000, { acc: 8 }))
    expect(step.verdict).toBe('jitter')
    expect(step.distanceM).toBe(0)
  })

  it('counts distance but stops the clock when creeping below walking pace', () => {
    // 4 m over 10 s = 0.4 m/s — real displacement, but not running or walking.
    const step = evaluateStep(east(0, 0, { acc: 5 }), east(4, 10_000, { acc: 5 }))
    expect(step.verdict).toBe('counted')
    expect(step.distanceM).toBeCloseTo(4, 0)
    expect(step.moving).toBe(false)
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

  it('accumulates slow creep instead of discarding every sub-floor hop', () => {
    // 1 m per fix for 10 fixes. Comparing each point to its predecessor would
    // throw all ten away; anchoring on the last *counted* point banks the
    // distance once the creep clears the floor.
    const path = Array.from({ length: 11 }, (_, i) => east(i, i * 1000, { acc: 4 }))
    expect(pathDistanceM(path)).toBeGreaterThan(8)
  })

  it('drops a GPS spike instead of billing the round trip', () => {
    const path = [
      east(0, 0, { acc: 5 }),
      east(3, 1000, { acc: 5 }),
      east(4000, 2000, { acc: 5 }), // spike 4 km away
      east(6, 3000, { acc: 5 }),
    ]
    // Only the real 6 m of travel survives; the 8 km round trip is rejected.
    expect(pathDistanceM(path)).toBeLessThan(10)
  })
})

describe('pathStats', () => {
  it('reports moving time separately from wall-clock time', () => {
    const path = [
      east(0, 0, { acc: 5 }),
      east(3, 1_000, { acc: 5 }),
      east(6, 2_000, { acc: 5 }),
      // A 60 s stop at a traffic light: half a meter of drift over a minute.
      east(6.5, 62_000, { acc: 5 }),
      east(9.5, 63_000, { acc: 5 }),
      east(12.5, 64_000, { acc: 5 }),
    ]
    const stats = pathStats(path)
    expect(stats.totalMs).toBe(64_000)
    // Wall clock spans 64 s; only the three 1 s running hops are moving time,
    // and the clock picks back up once the runner does.
    expect(stats.movingMs).toBe(3_000)
    expect(stats.distanceM).toBeCloseTo(12.5, 0)
  })

  it('counts rejected fixes', () => {
    const path = [
      east(0, 0, { acc: 5 }),
      east(9000, 1000, { acc: 5 }),
      east(3, 2000, { acc: 5 }),
    ]
    expect(pathStats(path).teleports).toBe(1)
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

  it('defaults to the recording threshold', () => {
    const path = [pt(0, 0, { acc: DEFAULT_MAX_ACCURACY_M + 1 })]
    expect(filterByAccuracy(path)).toHaveLength(0)
  })
})

describe('smoothPath', () => {
  it('leaves an empty path alone', () => {
    expect(smoothPath([])).toEqual([])
  })

  it('cuts the distance a noisy straight-line run over-reads', () => {
    // 100 fixes, 1 Hz, 3 m/s due east = 300 m of truth, with ±8 m of GPS noise.
    const noise = makeNoise(20260809)
    const truthM = 300
    const raw: GeoPoint[] = Array.from({ length: 101 }, (_, i) => ({
      lat: (noise() * 8) / M_PER_DEG,
      lng: (i * 3 + noise() * 8) / M_PER_DEG,
      t: i * 1000,
      acc: 8,
    }))

    const rawError = Math.abs(pathDistanceM(raw) - truthM)
    const smoothError = Math.abs(pathDistanceM(smoothPath(raw)) - truthM)

    // Raw noise inflates the total badly; smoothing brings it back near truth.
    expect(rawError).toBeGreaterThan(100)
    expect(smoothError).toBeLessThan(rawError / 3)
  })

  it('preserves the metadata of each fix', () => {
    const [first] = smoothPath([pt(1, 2, { t: 5, acc: 7, alt: 120 })])
    expect(first.t).toBe(5)
    expect(first.acc).toBe(7)
    expect(first.alt).toBe(120)
  })
})

describe('splitSegments', () => {
  it('keeps a continuous track in one piece', () => {
    const path = [east(0, 0), east(3, 1000), east(6, 2000)]
    expect(splitSegments(path)).toHaveLength(1)
  })

  it('breaks at an explicit pause marker', () => {
    const path = [east(0, 0), east(3, 1000), east(6, 2000, { gap: true })]
    expect(splitSegments(path)).toHaveLength(2)
  })

  it('breaks across a long silence', () => {
    const path = [east(0, 0), east(3, 1000), east(6, 120_000)]
    expect(splitSegments(path)).toHaveLength(2)
  })

  it('breaks across a jump too large to be a stride', () => {
    const path = [east(0, 0), east(3, 1000), east(900, 2000)]
    expect(splitSegments(path)).toHaveLength(2)
  })

  it('returns nothing for an empty path', () => {
    expect(splitSegments([])).toEqual([])
  })
})

describe('elevationGainM', () => {
  it('banks rises that clear the hysteresis band', () => {
    const path = [
      pt(0, 0, { alt: 100 }),
      pt(0, 1, { alt: 110 }), // +10 from the 100 m reference
      pt(0, 2, { alt: 104 }), // clear descent → reference drops to 104
      pt(0, 3, { alt: 124 }), // +20 from there
    ]
    expect(elevationGainM(path)).toBe(30)
  })

  it('ignores altimeter noise that never clears the band', () => {
    // A flat run whose reported altitude wobbles by a few meters each fix.
    const path = [104, 98, 103, 97, 102, 99, 101].map((alt, i) =>
      pt(0, i, { alt }),
    )
    expect(elevationGainM(path)).toBe(0)
  })

  it('returns 0 when altitude is missing', () => {
    expect(elevationGainM([pt(0, 0), pt(0, 1)])).toBe(0)
  })
})

describe('rollingPaceSecPerKm', () => {
  it('reports the recent pace, not the whole-run average', () => {
    // 60 s crawling 30 m, then 30 s running 150 m (5:00/km).
    const samples = [
      { t: 0, distanceM: 0 },
      { t: 60_000, distanceM: 30 },
      { t: 90_000, distanceM: 180 },
    ]
    // The window looks back 30 s: 150 m in 30 s → 200 s/km.
    expect(rollingPaceSecPerKm(samples)).toBeCloseTo(200, 0)
  })

  it('returns 0 while the window holds too little distance to be meaningful', () => {
    const samples = [
      { t: 0, distanceM: 0 },
      { t: 30_000, distanceM: 2 },
      { t: 60_000, distanceM: 4 },
    ]
    expect(rollingPaceSecPerKm(samples)).toBe(0)
  })

  it('returns 0 with fewer than two samples', () => {
    expect(rollingPaceSecPerKm([])).toBe(0)
    expect(rollingPaceSecPerKm([{ t: 0, distanceM: 0 }])).toBe(0)
  })
})

describe('prunePaceSamples', () => {
  it('keeps one sample before the cutoff so the window stays spannable', () => {
    const samples = [
      { t: 0, distanceM: 0 },
      { t: 10_000, distanceM: 30 },
      { t: 100_000, distanceM: 300 },
    ]
    const kept = prunePaceSamples(samples, 30_000)
    expect(kept).toHaveLength(2)
    expect(kept[0].t).toBe(10_000)
  })

  it('handles an empty list', () => {
    expect(prunePaceSamples([])).toEqual([])
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
