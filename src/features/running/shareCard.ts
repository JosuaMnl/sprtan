import type { GeoPoint, Run } from '../../db/types'
import type { WeightUnit } from '../../lib/units'
import type { Point2D } from '../../lib/projection'
import { projectPathToBox } from '../../lib/projection'
import { paceSecPerKm } from '../../lib/geo'
import {
  latToWorldY,
  lngToWorldX,
  pathBounds,
  pickZoomForBounds,
  TILE_SIZE,
} from '../../lib/tilemath'
import {
  DISTANCE_UNIT_LABEL,
  PACE_UNIT_LABEL,
  formatDistance,
  formatDuration,
  formatPace,
} from '../../lib/distance'

/** Story-format canvas (9:16), matching common share-to-photo targets. */
const CARD_W = 1080
const CARD_H = 1920

const CRIMSON = '#d9443c'
const BRONZE = '#c9a44a'
const MARBLE = '#f4efe6'
const MARBLE_DIM = 'rgba(226, 220, 208, 0.82)'
const STONE = '#211f1c'

const OSM_TILE_URL = 'https://tile.openstreetmap.org'

export type ShareCardMode = 'transparent' | 'map'

/** A time-of-day run title, à la Strava ("Evening Run" → "Lari Malam"). */
export function runTitle(startedAt: number): string {
  const h = new Date(startedAt).getHours()
  if (h >= 4 && h < 10) return 'Lari Pagi'
  if (h >= 10 && h < 15) return 'Lari Siang'
  if (h >= 15 && h < 18) return 'Lari Sore'
  return 'Lari Malam'
}

/** Best-effort: wait for the brand fonts so canvas text isn't a fallback. */
async function ensureFonts(): Promise<void> {
  if (!('fonts' in document)) return
  try {
    await Promise.all([
      document.fonts.load('700 104px Cinzel'),
      document.fonts.load('700 80px "IBM Plex Mono"'),
      document.fonts.load('500 36px Inter'),
    ])
    await document.fonts.ready
  } catch {
    // Fall back to system fonts — text still renders.
  }
}

/** Draw a Spartan lambda (Λ) mark with its base sitting on baseline `y`. */
function drawLambda(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = size * 0.18
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + size * 0.5, y - size)
  ctx.lineTo(x + size, y)
  ctx.stroke()
  ctx.restore()
}

/** Stroke the route polyline (optionally with a dark casing for map contrast). */
function drawRoute(
  ctx: CanvasRenderingContext2D,
  points: readonly Point2D[],
  withCasing: boolean,
): void {
  if (points.length < 2) {
    // Still show markers for a near-stationary run.
    if (points.length === 1) drawMarkers(ctx, points[0], points[0])
    return
  }

  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  const trace = () => {
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
    ctx.stroke()
  }

  if (withCasing) {
    // Dark outline so the line stays visible over busy map tiles.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.lineWidth = 20
    trace()
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
    ctx.shadowBlur = 18
  }

  ctx.strokeStyle = CRIMSON
  ctx.lineWidth = 14
  trace()
  ctx.restore()

  drawMarkers(ctx, points[0], points[points.length - 1])
}

function drawMarkers(
  ctx: CanvasRenderingContext2D,
  start: Point2D,
  end: Point2D,
): void {
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 10
  ctx.fillStyle = BRONZE
  ctx.beginPath()
  ctx.arc(start.x, start.y, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = CRIMSON
  ctx.strokeStyle = MARBLE
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(end.x, end.y, 18, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/** Draw the branding + stats block at the bottom-left. */
function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  run: Run,
  unit: WeightUnit,
): void {
  const x0 = 90
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  ctx.shadowBlur = 16
  ctx.shadowOffsetY = 2
  ctx.textBaseline = 'alphabetic'

  drawLambda(ctx, x0, 1352, 52, BRONZE)
  ctx.fillStyle = BRONZE
  ctx.font = '700 42px Cinzel, Georgia, serif'
  ctx.fillText('SPRTAN', x0 + 78, 1352)

  ctx.fillStyle = MARBLE
  ctx.font = '700 104px Cinzel, Georgia, serif'
  ctx.fillText(runTitle(run.startedAt), x0, 1476)

  const pace = paceSecPerKm(run.distanceM, run.durationMs)
  const cols: { label: string; value: string; unit: string }[] = [
    { label: 'Pace', value: formatPace(pace, unit), unit: PACE_UNIT_LABEL[unit] },
    { label: 'Waktu', value: formatDuration(run.durationMs), unit: '' },
    { label: 'Jarak', value: formatDistance(run.distanceM, unit), unit: DISTANCE_UNIT_LABEL[unit] },
  ]

  const labelY = 1600
  const valueY = 1688
  const gap = 72
  let cx = x0
  for (const col of cols) {
    ctx.fillStyle = MARBLE_DIM
    ctx.font = '500 36px Inter, system-ui, sans-serif'
    ctx.fillText(col.label, cx, labelY)

    ctx.fillStyle = MARBLE
    ctx.font = '700 80px "IBM Plex Mono", ui-monospace, monospace'
    const valueW = ctx.measureText(col.value).width
    ctx.fillText(col.value, cx, valueY)

    let unitW = 0
    if (col.unit) {
      ctx.fillStyle = MARBLE_DIM
      ctx.font = '500 40px Inter, system-ui, sans-serif'
      const label = ` ${col.unit}`
      ctx.fillText(label, cx + valueW + 6, valueY)
      unitW = ctx.measureText(label).width + 6
    }
    cx += valueW + unitW + gap
  }
  ctx.restore()
}

/** Load one OSM tile as a CORS-clean image; resolves null on any failure. */
function loadTile(z: number, x: number, y: number): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = `${OSM_TILE_URL}/${z}/${x}/${y}.png`
  })
}

/** Draw OSM street tiles covering the whole canvas, return the world→canvas map. */
async function drawMapBackground(
  ctx: CanvasRenderingContext2D,
  path: readonly GeoPoint[],
): Promise<((p: { lat: number; lng: number }) => Point2D) | null> {
  const bounds = pathBounds(path)
  if (!bounds) return null

  const z = pickZoomForBounds(bounds, CARD_W - 160, CARD_H - 160, 18)
  const centerWorldX = (lngToWorldX(bounds.minLng, z) + lngToWorldX(bounds.maxLng, z)) / 2
  const centerWorldY = (latToWorldY(bounds.minLat, z) + latToWorldY(bounds.maxLat, z)) / 2
  // Bias the route slightly above center so the bottom text block clears it.
  const originX = centerWorldX - CARD_W / 2
  const originY = centerWorldY - CARD_H * 0.42

  const n = 2 ** z
  const x0 = Math.floor(originX / TILE_SIZE)
  const x1 = Math.floor((originX + CARD_W) / TILE_SIZE)
  const y0 = Math.floor(originY / TILE_SIZE)
  const y1 = Math.floor((originY + CARD_H) / TILE_SIZE)

  const jobs: Promise<void>[] = []
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      if (ty < 0 || ty >= n) continue
      const wrappedX = ((tx % n) + n) % n
      const dx = tx * TILE_SIZE - originX
      const dy = ty * TILE_SIZE - originY
      jobs.push(
        loadTile(z, wrappedX, ty).then((img) => {
          if (img) ctx.drawImage(img, dx, dy, TILE_SIZE, TILE_SIZE)
        }),
      )
    }
  }
  await Promise.all(jobs)

  return (p) => ({ x: lngToWorldX(p.lng, z) - originX, y: latToWorldY(p.lat, z) - originY })
}

/** Draw the OSM attribution required by the tile usage policy. */
function drawAttribution(ctx: CanvasRenderingContext2D): void {
  ctx.save()
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'right'
  ctx.font = '400 26px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
  ctx.shadowBlur = 6
  ctx.fillText('© OpenStreetMap', CARD_W - 24, CARD_H - 20)
  ctx.restore()
}

/**
 * Render a run as a PNG share card. In 'transparent' mode the background keeps
 * its alpha channel (route + stats only) so it can be composited onto a photo.
 * In 'map' mode OSM street tiles are baked in behind the route (opaque), with a
 * bottom scrim so the stats stay legible.
 */
export async function renderRunShareCard(
  run: Run,
  unit: WeightUnit,
  mode: ShareCardMode = 'transparent',
): Promise<Blob> {
  await ensureFonts()

  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D tidak tersedia di peramban ini.')

  if (mode === 'map') {
    // Opaque stone base in case some tiles fail to load (offline / new area).
    ctx.fillStyle = STONE
    ctx.fillRect(0, 0, CARD_W, CARD_H)

    const project = await drawMapBackground(ctx, run.path)

    // Mute the map so the crimson route and text pop.
    ctx.fillStyle = 'rgba(20, 18, 16, 0.28)'
    ctx.fillRect(0, 0, CARD_W, CARD_H)

    // Bottom scrim behind the text block.
    const scrim = ctx.createLinearGradient(0, CARD_H * 0.6, 0, CARD_H)
    scrim.addColorStop(0, 'rgba(20, 18, 16, 0)')
    scrim.addColorStop(1, 'rgba(20, 18, 16, 0.82)')
    ctx.fillStyle = scrim
    ctx.fillRect(0, CARD_H * 0.6, CARD_W, CARD_H * 0.4)

    if (project) {
      const points = run.path.map(project)
      drawRoute(ctx, points, true)
    }
    drawAttribution(ctx)
    drawTextBlock(ctx, run, unit)
  } else {
    const points = projectPathToBox(run.path, CARD_W, CARD_H - 640, 150)
    drawRoute(ctx, points, false)
    drawTextBlock(ctx, run, unit)
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Gagal membuat gambar.'))),
      'image/png',
    )
  })
}

/** Suggested filename for a downloaded/shared card. */
export function shareCardFilename(run: Run, mode: ShareCardMode = 'transparent'): string {
  const suffix = mode === 'map' ? 'peta' : 'transparan'
  return `sprtan-lari-${run.date}-${suffix}.png`
}
