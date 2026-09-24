import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Pane,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet'
import type { LatLngExpression, LatLngTuple, PathOptions } from 'leaflet'
import type { GeoPoint } from '../../db/types'
import { haversineM } from '../../lib/geo'
import {
  EMPTY_ROUTE_CHUNKS,
  extendRouteChunks,
  type RouteChunkState,
} from '../../lib/routeChunks'
import 'leaflet/dist/leaflet.css'
import './run.css'

/** Central Jakarta — a sensible default view before the first GPS fix. */
const DEFAULT_CENTER: LatLngExpression = [-6.2088, 106.8456]

/** Don't nudge the map for movement smaller than this (in meters). */
const RECENTER_THRESHOLD_M = 12

// Styles are module constants on purpose: react-leaflet compares `pathOptions`
// by reference and calls `setStyle()` (a redraw) whenever it gets a new object.
// Inline literals would restyle every layer on every parent render.

// Colours live in CSS (see the `.run-route*` / `.run-marker-*` classes).
// Rounded joins and caps: the route reads as one continuous stroke instead of
// a chain of visibly welded chunks.
const ROUTE_STYLE: PathOptions = {
  className: 'run-route',
  weight: 5,
  lineJoin: 'round',
  lineCap: 'round',
}
const ROUTE_GLOW_STYLE: PathOptions = { ...ROUTE_STYLE, className: 'run-route-glow', weight: 14 }
const START_STYLE: PathOptions = { className: 'run-marker-start', weight: 3, fillOpacity: 1 }
const CURRENT_STYLE: PathOptions = { className: 'run-marker-current', weight: 3, fillOpacity: 1 }

interface RunMapProps {
  path: readonly GeoPoint[]
  current?: GeoPoint | null
  /** 'follow' keeps the map centered on the runner; 'fit' frames the whole route. */
  mode?: 'follow' | 'fit'
  className?: string
}

function toLatLngs(path: readonly GeoPoint[]): LatLngTuple[] {
  return path.map((p) => [p.lat, p.lng])
}

/**
 * Recenters the map on the current position, but yields to the user: as soon as
 * they drag or zoom, following stops until they ask for it back. Auto-panning
 * over someone inspecting their route is the fastest way to make a map feel
 * broken.
 */
function FollowController({
  current,
  following,
  onUserInteract,
}: {
  current?: GeoPoint | null
  following: boolean
  onUserInteract: () => void
}) {
  const map = useMap()
  const lastCentered = useRef<GeoPoint | null>(null)

  useEffect(() => {
    map.on('dragstart', onUserInteract)
    map.on('zoomstart', onUserInteract)
    return () => {
      map.off('dragstart', onUserInteract)
      map.off('zoomstart', onUserInteract)
    }
  }, [map, onUserInteract])

  useEffect(() => {
    if (!following || !current) return
    // Skip sub-threshold moves: re-centering on every 1 m of GPS wobble makes
    // the whole map shimmer while standing still.
    const previous = lastCentered.current
    if (previous && haversineM(previous, current) < RECENTER_THRESHOLD_M) return
    lastCentered.current = current
    map.panTo([current.lat, current.lng], { animate: true, duration: 0.5 })
  }, [current, following, map])

  return null
}

/** Fits the map bounds to the full recorded route (for run review). */
function FitController({ path }: { path: readonly GeoPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (path.length === 0) return
    if (path.length === 1) {
      map.setView([path[0].lat, path[0].lng], 16)
      return
    }
    map.fitBounds(toLatLngs(path), { padding: [24, 24] })
  }, [path, map])
  return null
}

/**
 * Memoized so the live readouts ticking twice a second on the tracking page
 * don't re-render the map; it only updates when the route or position changes.
 */
export const RunMap = memo(function RunMap({
  path,
  current,
  mode = 'follow',
  className,
}: RunMapProps) {
  const [following, setFollowing] = useState(true)
  const stopFollowing = useCallback(() => setFollowing(false), [])

  // Paused spans and signal dropouts become separate polylines — one unbroken
  // line would draw a straight bar across everything the runner didn't run.
  // Built incrementally: a new GPS fix only touches the newest chunk, so older
  // polylines keep their positions array and Leaflet never redraws them.
  const chunkState = useRef<RouteChunkState>(EMPTY_ROUTE_CHUNKS)
  const chunks = useMemo(() => {
    // Idempotent for the same `path`, so a repeated render pass is harmless.
    chunkState.current = extendRouteChunks(chunkState.current, path)
    return chunkState.current.chunks
  }, [path])

  const start = path[0]
  // Stable tuples: react-leaflet calls `setLatLng()` whenever `center` changes
  // by reference, even if the coordinates are the same.
  const startCenter = useMemo<LatLngTuple | null>(
    () => (start ? [start.lat, start.lng] : null),
    [start],
  )
  const currentCenter = useMemo<LatLngTuple | null>(
    () => (current ? [current.lat, current.lng] : null),
    [current],
  )
  const center: LatLngExpression = current
    ? [current.lat, current.lng]
    : start
      ? [start.lat, start.lng]
      : DEFAULT_CENTER

  return (
    <div className={['run-map-wrap', className].filter(Boolean).join(' ')}>
      <MapContainer center={center} zoom={16} scrollWheelZoom className="run-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          // CORS-enable so tiles cached here are reusable by the share-card canvas
          // without tainting it (see shareCard.ts).
          crossOrigin="anonymous"
        />

        {/* Colours come from CSS (.run-route*) so the route follows the
            light/dark surface tokens; SVG attributes can't read var().
            The glow sits in its own pane whose opacity is applied to the pane
            as a whole: consecutive chunks share a joint point, and per-stroke
            alpha would darken every place where two chunks overlap. */}
        <Pane name="routeGlowPane" className="run-route-glow-pane">
          {chunks.map((chunk) =>
            chunk.positions.length > 1 ? (
              <Polyline
                key={chunk.key}
                positions={chunk.positions}
                pathOptions={ROUTE_GLOW_STYLE}
                smoothFactor={1.2}
                interactive={false}
              />
            ) : null,
          )}
        </Pane>
        {chunks.map((chunk) =>
          chunk.positions.length > 1 ? (
            <Polyline
              key={chunk.key}
              positions={chunk.positions}
              pathOptions={ROUTE_STYLE}
              smoothFactor={1.2}
            />
          ) : null,
        )}

        {startCenter && (
          <CircleMarker center={startCenter} radius={7} pathOptions={START_STYLE} />
        )}

        {currentCenter && (
          <CircleMarker center={currentCenter} radius={8} pathOptions={CURRENT_STYLE} />
        )}

        {mode === 'follow' ? (
          <FollowController
            current={current}
            following={following}
            onUserInteract={stopFollowing}
          />
        ) : (
          <FitController path={path} />
        )}
      </MapContainer>

      {mode === 'follow' && !following && (
        <button
          type="button"
          className="run-map__recenter"
          onClick={() => setFollowing(true)}
        >
          Pusatkan
        </button>
      )}
    </div>
  )
})
