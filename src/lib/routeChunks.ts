import type { GeoPoint } from '../db/types'
import { isSegmentBreak } from './geo'

/** A `[lat, lng]` pair, the shape Leaflet polylines take. */
export type LatLngPair = [number, number]

/** One polyline's worth of route, with a key that stays stable while it grows. */
export interface RouteChunk {
  key: number
  positions: LatLngPair[]
}

/**
 * Incremental build state. `chunks` is what gets rendered; the rest lets the
 * next call recognise an appended path and process only the new points.
 */
export interface RouteChunkState {
  chunks: readonly RouteChunk[]
  /** How many path points have been folded into `chunks`. */
  count: number
  /** The last folded point, by reference, to detect a path that was replaced. */
  lastPoint: GeoPoint | null
  nextKey: number
}

/**
 * Cap on points per polyline. Leaflet re-projects and redraws a whole polyline
 * whenever its positions change, so capping the live chunk keeps the per-fix
 * cost flat no matter how long the run gets.
 */
export const ROUTE_CHUNK_SIZE = 400

export const EMPTY_ROUTE_CHUNKS: RouteChunkState = {
  chunks: [],
  count: 0,
  lastPoint: null,
  nextKey: 0,
}

function extendsPrevious(state: RouteChunkState, path: readonly GeoPoint[]): boolean {
  if (path.length < state.count) return false
  return state.count === 0 || path[state.count - 1] === state.lastPoint
}

/**
 * Fold new track points into render-ready polyline chunks.
 *
 * Breaks land exactly where `splitSegments` puts them. Long segments are further
 * cut into chunks of at most `chunkSize` points, each continuation starting on
 * the previous chunk's last point so the stroke stays seamless. When `path` only
 * appended points since the last call, chunks that did not change are returned
 * by reference, so their polylines are never redrawn. Any other change to
 * `path` rebuilds from scratch.
 */
export function extendRouteChunks(
  state: RouteChunkState,
  path: readonly GeoPoint[],
  chunkSize = ROUTE_CHUNK_SIZE,
): RouteChunkState {
  const base = extendsPrevious(state, path) ? state : EMPTY_ROUTE_CHUNKS
  if (base.count === path.length) return base

  const chunks = [...base.chunks]
  let nextKey = base.nextKey
  let live: RouteChunk | null = chunks[chunks.length - 1] ?? null
  // Chunks from `base` may already be rendered, so the live one is copied the
  // first time it gains a point; chunks created here are fresh and never shared.
  let liveIsFresh = false

  const startChunk = (positions: LatLngPair[]): RouteChunk => {
    const chunk = { key: nextKey++, positions }
    chunks.push(chunk)
    liveIsFresh = true
    return chunk
  }

  for (let i = base.count; i < path.length; i++) {
    const point = path[i]
    const pair: LatLngPair = [point.lat, point.lng]
    if (!live || i === 0 || isSegmentBreak(path[i - 1], point)) {
      live = startChunk([pair])
    } else if (live.positions.length >= chunkSize) {
      live = startChunk([live.positions[live.positions.length - 1], pair])
    } else {
      if (!liveIsFresh) {
        live = { key: live.key, positions: [...live.positions] }
        chunks[chunks.length - 1] = live
        liveIsFresh = true
      }
      live.positions.push(pair)
    }
  }

  return {
    chunks,
    count: path.length,
    lastPoint: path[path.length - 1] ?? null,
    nextKey,
  }
}
