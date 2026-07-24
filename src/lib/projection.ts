export interface Point2D {
  x: number
  y: number
}

interface LatLng {
  lat: number
  lng: number
}

/**
 * Project a GPS path into a width×height box (in pixels), preserving the route's
 * real-world aspect ratio and centering it with a `padding` px inset.
 *
 * Uses an equirectangular projection with longitude scaled by cos(latitude) so
 * the shape isn't horizontally stretched away from the equator, and flips Y so
 * north points up. Returns [] for an empty path; a single point maps to the
 * box center.
 */
export function projectPathToBox(
  path: readonly LatLng[],
  width: number,
  height: number,
  padding = 0,
): Point2D[] {
  if (path.length === 0) return []

  let sumLat = 0
  for (const p of path) sumLat += p.lat
  const cosLat = Math.cos((sumLat / path.length) * (Math.PI / 180))

  // World coordinates: x scaled by cos(lat) so 1° lng ≈ 1° lat visually.
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  const world = path.map((p) => {
    const x = p.lng * cosLat
    const y = p.lat
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    return { x, y }
  })

  const spanX = maxX - minX
  const spanY = maxY - minY
  const availW = Math.max(0, width - padding * 2)
  const availH = Math.max(0, height - padding * 2)

  // A path with no extent (single point or all-identical) maps to the center.
  if (spanX === 0 && spanY === 0) {
    return world.map(() => ({ x: width / 2, y: height / 2 }))
  }

  // Uniform scale that fits every axis with a real span (preserves aspect
  // ratio). A degenerate axis (span 0) contributes no constraint and no extent.
  const scaleCandidates: number[] = []
  if (spanX > 0) scaleCandidates.push(availW / spanX)
  if (spanY > 0) scaleCandidates.push(availH / spanY)
  const scale = Math.min(...scaleCandidates)

  const drawW = spanX * scale // 0 when spanX is 0 → axis is centered exactly
  const drawH = spanY * scale
  const offX = padding + (availW - drawW) / 2
  const offY = padding + (availH - drawH) / 2

  return world.map((w) => ({
    x: offX + (w.x - minX) * scale,
    y: offY + (maxY - w.y) * scale, // flip Y so north is up
  }))
}
