/**
 * Web Mercator (EPSG:3857) slippy-map tile math — the same projection OSM tiles
 * use, so a route drawn with these helpers lines up with the street tiles.
 */

export const TILE_SIZE = 256

/** World-pixel X for a longitude at zoom `z` (0 = antimeridian west edge). */
export function lngToWorldX(lng: number, z: number): number {
  return ((lng + 180) / 360) * TILE_SIZE * 2 ** z
}

/** World-pixel Y for a latitude at zoom `z` (0 = north edge, increases south). */
export function latToWorldY(lat: number, z: number): number {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat))
  const s = Math.sin((clamped * Math.PI) / 180)
  const y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)
  return y * TILE_SIZE * 2 ** z
}

export interface Bounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

/** Lat/lng bounding box of a path (returns null for an empty path). */
export function pathBounds(
  path: readonly { lat: number; lng: number }[],
): Bounds | null {
  if (path.length === 0) return null
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  for (const p of path) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  return { minLat, maxLat, minLng, maxLng }
}

/**
 * Largest zoom (≤ maxZoom) at which the bounds fit within availW×availH pixels.
 * A degenerate (single-point) bounds always fits, so it returns maxZoom.
 */
export function pickZoomForBounds(
  bounds: Bounds,
  availW: number,
  availH: number,
  maxZoom = 18,
  minZoom = 1,
): number {
  for (let z = maxZoom; z >= minZoom; z--) {
    const spanX = Math.abs(lngToWorldX(bounds.maxLng, z) - lngToWorldX(bounds.minLng, z))
    const spanY = Math.abs(latToWorldY(bounds.minLat, z) - latToWorldY(bounds.maxLat, z))
    if (spanX <= availW && spanY <= availH) return z
  }
  return minZoom
}
