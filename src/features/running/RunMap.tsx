import { useEffect } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import type { GeoPoint } from '../../db/types'
import 'leaflet/dist/leaflet.css'
import './run.css'

/** Central Jakarta — a sensible default view before the first GPS fix. */
const DEFAULT_CENTER: LatLngExpression = [-6.2088, 106.8456]

interface RunMapProps {
  path: readonly GeoPoint[]
  current?: GeoPoint | null
  /** 'follow' keeps the map centered on the runner; 'fit' frames the whole route. */
  mode?: 'follow' | 'fit'
  className?: string
}

function toLatLngs(path: readonly GeoPoint[]): LatLngExpression[] {
  return path.map((p) => [p.lat, p.lng])
}

/** Recenters the map on the current position as the run progresses. */
function FollowController({ current }: { current?: GeoPoint | null }) {
  const map = useMap()
  useEffect(() => {
    if (current) map.setView([current.lat, current.lng], map.getZoom(), { animate: true })
  }, [current, map])
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
    map.fitBounds(toLatLngs(path) as [number, number][], { padding: [24, 24] })
  }, [path, map])
  return null
}

export function RunMap({ path, current, mode = 'follow', className }: RunMapProps) {
  const start = path[0]
  const center: LatLngExpression = current
    ? [current.lat, current.lng]
    : start
      ? [start.lat, start.lng]
      : DEFAULT_CENTER

  return (
    <MapContainer
      center={center}
      zoom={16}
      scrollWheelZoom
      className={['run-map', className].filter(Boolean).join(' ')}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        // CORS-enable so tiles cached here are reusable by the share-card canvas
        // without tainting it (see shareCard.ts).
        crossOrigin="anonymous"
      />

      {path.length > 1 && (
        <Polyline
          positions={toLatLngs(path)}
          pathOptions={{ color: '#d9443c', weight: 5, opacity: 0.9 }}
        />
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
        <FollowController current={current} />
      ) : (
        <FitController path={path} />
      )}
    </MapContainer>
  )
}
