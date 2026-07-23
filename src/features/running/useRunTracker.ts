import { useCallback, useEffect, useRef, useState } from 'react'
import type { GeoPoint } from '../../db/types'
import { elevationGainM, haversineM } from '../../lib/geo'

export type RunStatus = 'idle' | 'tracking' | 'paused' | 'finished'

export interface RunTrackerState {
  status: RunStatus
  /** Accuracy-filtered GPS track accumulated so far. */
  path: GeoPoint[]
  /** Live distance in meters. */
  distanceM: number
  /** Moving time in ms (excludes paused spans). */
  elapsedMs: number
  /** ms epoch of the first accepted fix, or null before start. */
  startedAt: number | null
  /** Most recent accepted position, for map centering. */
  current: GeoPoint | null
  /** User-facing error message, or null. */
  error: string | null
}

export interface RunTracker extends RunTrackerState {
  elevationGainM: number
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  reset: () => void
}

/** Positions worse than this (meters) are discarded as too noisy. */
const MAX_ACCURACY_M = 30
/** Hops shorter than this (meters) are treated as GPS jitter, not movement. */
const MIN_STEP_M = 2

function geoErrorMessage(err: GeoLocationPositionErrorLike): string {
  switch (err.code) {
    case 1:
      return 'Izin lokasi ditolak. Aktifkan akses lokasi untuk melacak lari.'
    case 2:
      return 'Sinyal GPS tidak tersedia. Coba di ruang terbuka.'
    case 3:
      return 'Pencarian sinyal GPS terlalu lama.'
    default:
      return 'Gagal membaca lokasi.'
  }
}

interface GeoLocationPositionErrorLike {
  code: number
  message: string
}

/**
 * Tracks a run via the Geolocation API. Recording only happens while status is
 * 'tracking'; pausing keeps the accumulated data but freezes the clock and
 * ignores incoming fixes. All timers and the geolocation watch are cleaned up
 * on unmount.
 */
export function useRunTracker(): RunTracker {
  const [status, setStatus] = useState<RunStatus>('idle')
  const [path, setPath] = useState<GeoPoint[]>([])
  const [distanceM, setDistanceM] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [current, setCurrent] = useState<GeoPoint | null>(null)
  const [error, setError] = useState<string | null>(null)

  const watchId = useRef<number | null>(null)
  const tickId = useRef<ReturnType<typeof setInterval> | null>(null)
  // Timestamp when the current moving span began; null while paused/idle.
  const segmentStart = useRef<number | null>(null)
  // Moving time banked from previous (already-ended) spans.
  const bankedMs = useRef(0)
  // Last position counted toward distance (min-step filter reference).
  const lastCounted = useRef<GeoPoint | null>(null)

  const clearWatch = useCallback(() => {
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current)
    }
    watchId.current = null
  }, [])

  const clearTick = useCallback(() => {
    if (tickId.current != null) clearInterval(tickId.current)
    tickId.current = null
  }, [])

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      clearWatch()
      clearTick()
    }
  }, [clearWatch, clearTick])

  const handlePosition = useCallback((pos: GeolocationPosition) => {
    const point: GeoPoint = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      t: pos.timestamp,
      alt: pos.coords.altitude ?? undefined,
      acc: pos.coords.accuracy ?? undefined,
    }

    setError(null)
    setCurrent(point)

    // Discard low-confidence fixes.
    if (point.acc != null && point.acc > MAX_ACCURACY_M) return

    setPath((prev) => [...prev, point])

    const prevCounted = lastCounted.current
    if (prevCounted) {
      const step = haversineM(prevCounted, point)
      if (step >= MIN_STEP_M) {
        setDistanceM((d) => d + step)
        lastCounted.current = point
      }
    } else {
      lastCounted.current = point
    }

    setStartedAt((s) => s ?? point.t)
  }, [])

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(geoErrorMessage(err))
  }, [])

  const beginWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Perangkat ini tidak mendukung GPS.')
      return false
    }
    watchId.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    )
    return true
  }, [handlePosition, handleError])

  const beginTick = useCallback(() => {
    clearTick()
    tickId.current = setInterval(() => {
      const running = segmentStart.current
      const live = running != null ? Date.now() - running : 0
      setElapsedMs(bankedMs.current + live)
    }, 500)
  }, [clearTick])

  const start = useCallback(() => {
    setPath([])
    setDistanceM(0)
    setElapsedMs(0)
    setStartedAt(null)
    setCurrent(null)
    setError(null)
    lastCounted.current = null
    bankedMs.current = 0
    segmentStart.current = Date.now()
    if (beginWatch()) {
      setStatus('tracking')
      beginTick()
    }
  }, [beginWatch, beginTick])

  const pause = useCallback(() => {
    if (segmentStart.current != null) {
      bankedMs.current += Date.now() - segmentStart.current
      segmentStart.current = null
    }
    setElapsedMs(bankedMs.current)
    clearTick()
    clearWatch()
    // Break the min-step chain so the resume gap isn't counted as one long hop.
    lastCounted.current = null
    setStatus('paused')
  }, [clearTick, clearWatch])

  const resume = useCallback(() => {
    segmentStart.current = Date.now()
    if (beginWatch()) {
      setStatus('tracking')
      beginTick()
    }
  }, [beginWatch, beginTick])

  const stop = useCallback(() => {
    if (segmentStart.current != null) {
      bankedMs.current += Date.now() - segmentStart.current
      segmentStart.current = null
    }
    setElapsedMs(bankedMs.current)
    clearTick()
    clearWatch()
    setStatus('finished')
  }, [clearTick, clearWatch])

  const reset = useCallback(() => {
    clearTick()
    clearWatch()
    segmentStart.current = null
    bankedMs.current = 0
    lastCounted.current = null
    setStatus('idle')
    setPath([])
    setDistanceM(0)
    setElapsedMs(0)
    setStartedAt(null)
    setCurrent(null)
    setError(null)
  }, [clearTick, clearWatch])

  return {
    status,
    path,
    distanceM,
    elapsedMs,
    startedAt,
    current,
    error,
    elevationGainM: elevationGainM(path),
    start,
    pause,
    resume,
    stop,
    reset,
  }
}
