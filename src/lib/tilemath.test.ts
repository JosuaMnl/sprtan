import { describe, expect, it } from 'vitest'
import {
  latToWorldY,
  lngToWorldX,
  pathBounds,
  pickZoomForBounds,
  TILE_SIZE,
} from './tilemath'

describe('lngToWorldX', () => {
  it('maps the antimeridian, prime meridian, and east edge at zoom 0', () => {
    expect(lngToWorldX(-180, 0)).toBeCloseTo(0, 6)
    expect(lngToWorldX(0, 0)).toBeCloseTo(TILE_SIZE / 2, 6)
    expect(lngToWorldX(180, 0)).toBeCloseTo(TILE_SIZE, 6)
  })

  it('doubles the world width per zoom level', () => {
    expect(lngToWorldX(180, 1)).toBeCloseTo(TILE_SIZE * 2, 6)
  })
})

describe('latToWorldY', () => {
  it('maps the equator to the vertical center at zoom 0', () => {
    expect(latToWorldY(0, 0)).toBeCloseTo(TILE_SIZE / 2, 6)
  })

  it('increases southward (north is a smaller Y)', () => {
    expect(latToWorldY(10, 5)).toBeLessThan(latToWorldY(-10, 5))
  })

  it('clamps beyond the Mercator limit without producing Infinity', () => {
    expect(Number.isFinite(latToWorldY(89, 3))).toBe(true)
    expect(Number.isFinite(latToWorldY(-89, 3))).toBe(true)
  })
})

describe('pathBounds', () => {
  it('returns null for an empty path', () => {
    expect(pathBounds([])).toBeNull()
  })

  it('computes the min/max lat/lng', () => {
    const b = pathBounds([
      { lat: -6.2, lng: 106.8 },
      { lat: -6.1, lng: 106.9 },
      { lat: -6.25, lng: 106.85 },
    ])
    expect(b).toEqual({ minLat: -6.25, maxLat: -6.1, minLng: 106.8, maxLng: 106.9 })
  })
})

describe('pickZoomForBounds', () => {
  it('returns maxZoom for a degenerate (single-point) bounds', () => {
    const b = { minLat: -6.2, maxLat: -6.2, minLng: 106.8, maxLng: 106.8 }
    expect(pickZoomForBounds(b, 800, 800, 18)).toBe(18)
  })

  it('picks a zoom whose pixel span fits the available box', () => {
    const b = { minLat: -6.25, maxLat: -6.15, minLng: 106.8, maxLng: 106.95 }
    const z = pickZoomForBounds(b, 800, 800, 18)
    const spanX = Math.abs(lngToWorldX(b.maxLng, z) - lngToWorldX(b.minLng, z))
    const spanY = Math.abs(latToWorldY(b.minLat, z) - latToWorldY(b.maxLat, z))
    expect(spanX).toBeLessThanOrEqual(800)
    expect(spanY).toBeLessThanOrEqual(800)
    // One zoom deeper would overflow (otherwise it isn't the *largest* fit).
    const spanXDeeper = Math.abs(lngToWorldX(b.maxLng, z + 1) - lngToWorldX(b.minLng, z + 1))
    expect(spanXDeeper).toBeGreaterThan(800)
  })
})
