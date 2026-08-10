import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet'
import type { LatLngExpression, LatLngTuple } from 'leaflet'
import type { GeoPoint } from '../../db/types'
import { haversineM, splitSegments } from '../../lib/geo'
import 'leaflet/dist/leaflet.css'
import './run.css'

/** Central Jakarta — a sensible default view before the first GPS fix. */
const DEFAULT_CENTER: LatLngExpression = [-6.2088, 106.8456]

/** Don't nudge the map for movement smaller than this (in meters). */
const RECENTER_THRESHOLD_M = 12

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

export function RunMap({ path, current, mode = 'follow', className }: RunMapProps) {
  const [following, setFollowing] = useState(true)
  const stopFollowing = useCallback(() => setFollowing(false), [])

  // Paused spans and signal dropouts become separate polylines — one unbroken
  // line would draw a straight bar across everything the runner didn't run.
  const segments = useMemo(() => splitSegments(path).map(toLatLngs), [path])

  const start = path[0]
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

        {segments.map((positions, i) =>
          positions.length > 1 ? (
            <Polyline
              key={`seg-${i}`}
              positions={positions}
              // Rounded joins plus a dark casing underneath: the route stays
              // readable over busy tiles and reads as one continuous stroke
              // instead of a chain of visibly welded segments.
              pathOptions={{
                color: '#d9443c',
                weight: 5,
                opacity: 0.95,
                lineJoin: 'round',
                lineCap: 'round',
              }}
              smoothFactor={1.2}
            />
          ) : null,
        )}

        {start && (
          <CircleMarker
            center={[start.lat, start.lng]}
            radius={7}
            pathOptions={{ color: '#c9a44a', fillColor: '#c9a44a', fillOpacity: 1, weight: 2 }}
          />
        )}

        {current && (
          <CircleMarker
            center={[current.lat, current.lng]}
            radius={8}
            pathOptions={{ color: '#fff', fillColor: '#d9443c', fillOpacity: 1, weight: 3 }}
          />
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
}
