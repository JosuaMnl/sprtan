import { describe, expect, it } from 'vitest'
import { projectPathToBox } from './projection'

describe('projectPathToBox', () => {
  it('returns an empty array for an empty path', () => {
    expect(projectPathToBox([], 100, 100)).toEqual([])
  })

  it('maps a single point to the box center', () => {
    const [p] = projectPathToBox([{ lat: -6.2, lng: 106.8 }], 100, 200)
    expect(p.x).toBeCloseTo(50, 5)
    expect(p.y).toBeCloseTo(100, 5)
  })

  it('keeps all projected points within the padded box', () => {
    const path = [
      { lat: 0, lng: 0 },
      { lat: 0.01, lng: 0.02 },
      { lat: 0.005, lng: 0.03 },
      { lat: -0.004, lng: 0.008 },
    ]
    const pts = projectPathToBox(path, 300, 500, 20)
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(20 - 1e-6)
      expect(p.x).toBeLessThanOrEqual(280 + 1e-6)
      expect(p.y).toBeGreaterThanOrEqual(20 - 1e-6)
      expect(p.y).toBeLessThanOrEqual(480 + 1e-6)
    }
  })

  it('flips Y so the northernmost point is highest on screen (smallest y)', () => {
    const path = [
      { lat: 0, lng: 0 }, // south
      { lat: 0.02, lng: 0 }, // north
    ]
    const [south, north] = projectPathToBox(path, 200, 200, 10)
    expect(north.y).toBeLessThan(south.y)
  })

  it('preserves aspect ratio (a north-south line stays vertical)', () => {
    const path = [
      { lat: 0, lng: 0 },
      { lat: 0.02, lng: 0 },
    ]
    const pts = projectPathToBox(path, 400, 400, 0)
    // No horizontal span → both points share the same x (centered).
    expect(pts[0].x).toBeCloseTo(pts[1].x, 5)
    expect(pts[0].x).toBeCloseTo(200, 5)
  })

  it('scales a wide route to fill the width when width-limited', () => {
    const path = [
      { lat: 0, lng: 0 },
      { lat: 0.001, lng: 0.05 }, // much wider than tall
    ]
    const pts = projectPathToBox(path, 300, 300, 0)
    const minX = Math.min(...pts.map((p) => p.x))
    const maxX = Math.max(...pts.map((p) => p.x))
    // The wide axis should span (near) the full 300px width.
    expect(maxX - minX).toBeGreaterThan(290)
  })
})
