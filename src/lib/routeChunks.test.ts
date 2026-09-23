import { describe, expect, it } from 'vitest'
import type { GeoPoint } from '../db/types'
import { splitSegments } from './geo'
import { EMPTY_ROUTE_CHUNKS, extendRouteChunks } from './routeChunks'

/** Meters per degree of longitude at the equator, handy for building tracks. */
const M_PER_DEG = 111_320

/** A point `meters` east of the origin, sampled at `t` ms. */
function east(meters: number, t: number, extra: Partial<GeoPoint> = {}): GeoPoint {
  return { lat: 0, lng: meters / M_PER_DEG, t, ...extra }
}

/** A continuous track of `n` points, 3 m and 1 s apart. */
function track(n: number, from = 0): GeoPoint[] {
  return Array.from({ length: n }, (_, i) => east((from + i) * 3, (from + i) * 1000))
}

describe('extendRouteChunks', () => {
  it('returns no chunks for an empty path', () => {
    expect(extendRouteChunks(EMPTY_ROUTE_CHUNKS, []).chunks).toEqual([])
  })

  it('breaks exactly where splitSegments does', () => {
    const path = [
      ...track(5),
      east(15, 5000, { gap: true }),
      east(18, 6000),
      east(21, 200_000),
      east(900, 201_000),
    ]
    const chunks = extendRouteChunks(EMPTY_ROUTE_CHUNKS, path).chunks
    expect(chunks.map((c) => c.positions.length)).toEqual(
      splitSegments(path).map((s) => s.length),
    )
  })

  it('caps chunk size and overlaps one point so the stroke stays joined', () => {
    const chunks = extendRouteChunks(EMPTY_ROUTE_CHUNKS, track(10), 4).chunks
    expect(chunks.map((c) => c.positions.length)).toEqual([4, 4, 4])
    expect(chunks[1].positions[0]).toEqual(chunks[0].positions[3])
    expect(chunks[2].positions[0]).toEqual(chunks[1].positions[3])
  })

  it('matches a full rebuild when points arrive one at a time', () => {
    const path = [...track(9), east(27, 9000, { gap: true }), ...track(6, 10)]
    let state = EMPTY_ROUTE_CHUNKS
    for (let n = 1; n <= path.length; n++) {
      state = extendRouteChunks(state, path.slice(0, n), 4)
    }
    const rebuilt = extendRouteChunks(EMPTY_ROUTE_CHUNKS, path, 4)
    expect(state.chunks).toEqual(rebuilt.chunks)
  })

  it('reuses unchanged chunks by reference when points are appended', () => {
    const path = track(9)
    const before = extendRouteChunks(EMPTY_ROUTE_CHUNKS, path, 4)
    const after = extendRouteChunks(before, [...path, east(27, 9000)], 4)
    expect(after.chunks[0]).toBe(before.chunks[0])
    expect(after.chunks[1]).toBe(before.chunks[1])
    expect(after.chunks[2]).not.toBe(before.chunks[2])
    expect(after.chunks[2].key).toBe(before.chunks[2].key)
  })

  it('does not alter chunks it has already returned', () => {
    const path = track(3)
    const before = extendRouteChunks(EMPTY_ROUTE_CHUNKS, path)
    const snapshot = before.chunks[0].positions.slice()
    extendRouteChunks(before, [...path, east(9, 3000)])
    expect(before.chunks[0].positions).toEqual(snapshot)
  })

  it('returns the same state for the same path', () => {
    const path = track(5)
    const state = extendRouteChunks(EMPTY_ROUTE_CHUNKS, path)
    expect(extendRouteChunks(state, path)).toBe(state)
  })

  it('rebuilds when the path is replaced rather than appended', () => {
    const state = extendRouteChunks(EMPTY_ROUTE_CHUNKS, track(5))
    const other = track(3, 100)
    expect(extendRouteChunks(state, other).chunks).toEqual(
      extendRouteChunks(EMPTY_ROUTE_CHUNKS, other).chunks,
    )
    expect(extendRouteChunks(state, []).chunks).toEqual([])
  })
})
