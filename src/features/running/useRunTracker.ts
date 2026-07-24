import { useCallback, useEffect, useRef, useState } from 'react'
import type { GeoPoint } from '../../db/types'
import {
  DEFAULT_MAX_ACCURACY_M,
  DEFAULT_MIN_STEP_M,
  elevationGainM,
  haversineM,
} from '../../lib/geo'

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

// GPS-noise thresholds are shared with geo.ts so the live tracker and the batch
// distance helpers can never silently diverge. The live accumulation below
// mirrors pathDistanceM's algorithm incrementally (one hop at a time).
const MAX_ACCURACY_M = DEFAULT_MAX_ACCURACY_M
const MIN_STEP_M = DEFAULT_MIN_STEP_M

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

  const handleError = useCallback(
    (err: GeolocationPositionError) => {
      setError(geoErrorMessage(err))
      // PERMISSION_DENIED (1) is unrecoverable — keeping the watch and the
      // elapsed clock running would show a "tracking" UI that records nothing.
      // Halt back to idle so the user sees the error and can retry.
      if (err.code === 1) {
        clearWatch()
        clearTick()
        segmentStart.current = null
        setStatus('idle')
      }
    },
    [clearWatch, clearTick],
  )

  const beginWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Perangkat ini tidak mendukung GPS.')
      return false
    }
    // Defensive: clear any existing watch first so a double start/resume (a
    // common accidental double-tap) can never leak an orphaned watcher.
    clearWatch()
    watchId.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    )
    return true
  }, [handlePosition, handleError, clearWatch])

  const beginTick = useCallback(() => {
    clearTick()
    tickId.current = setInterval(() => {
      const running = segmentStart.current
      const live = running != null ? Date.now() - running : 0
      setElapsedMs(bankedMs.current + live)
    }, 500)
  }, [clearTick])

  const start = useCallback(() => {
    if (status !== 'idle') return
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
  }, [status, beginWatch, beginTick])

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
    if (status !== 'paused') return
    segmentStart.current = Date.now()
    if (beginWatch()) {
      setStatus('tracking')
      beginTick()
    }
  }, [status, beginWatch, beginTick])

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
