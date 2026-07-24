import type { Run } from '../../db/types'
import type { WeightUnit } from '../../lib/units'
import { projectPathToBox } from '../../lib/projection'
import { paceSecPerKm } from '../../lib/geo'
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

/**
 * Render a run as a transparent PNG overlay (route + stats + Sprtan branding)
 * that can be composited onto a photo. The background is never filled, so the
 * PNG keeps its alpha channel; text and route carry soft shadows so they stay
 * legible on any backdrop.
 */
export async function renderRunShareCard(
  run: Run,
  unit: WeightUnit,
): Promise<Blob> {
  await ensureFonts()

  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D tidak tersedia di peramban ini.')

  // ---- Route (upper region, leaving room for the text block) ----
  const points = projectPathToBox(run.path, CARD_W, CARD_H - 640, 150)
  if (points.length > 1) {
    ctx.save()
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
    ctx.shadowBlur = 18
    ctx.strokeStyle = CRIMSON
    ctx.lineWidth = 14
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
    ctx.stroke()
    ctx.restore()

    const start = points[0]
    const end = points[points.length - 1]
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

  // ---- Text block (bottom-left) ----
  const x0 = 90
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  ctx.shadowBlur = 16
  ctx.shadowOffsetY = 2
  ctx.textBaseline = 'alphabetic'

  // Brand row
  drawLambda(ctx, x0, 1352, 52, BRONZE)
  ctx.fillStyle = BRONZE
  ctx.font = '700 42px Cinzel, Georgia, serif'
  ctx.fillText('SPRTAN', x0 + 78, 1352)

  // Title
  ctx.fillStyle = MARBLE
  ctx.font = '700 104px Cinzel, Georgia, serif'
  ctx.fillText(runTitle(run.startedAt), x0, 1476)

  // Stats row (Pace · Waktu · Jarak), laid out left-to-right by measured width
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

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Gagal membuat gambar.'))),
      'image/png',
    )
  })
}

/** Suggested filename for a downloaded/shared card. */
export function shareCardFilename(run: Run): string {
  return `sprtan-lari-${run.date}.png`
}
