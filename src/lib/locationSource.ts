import { Capacitor, registerPlugin } from '@capacitor/core'
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation'
import type { GeoPoint } from '../db/types'

/**
 * Error shape shared by both backends. Codes follow the Geolocation API
 * (1 = permission denied, 2 = position unavailable, 3 = timeout) so callers
 * can map them to messages without caring which backend produced them.
 */
export interface LocationError {
  code: number
  message: string
}

export type StopWatching = () => void

const PERMISSION_DENIED = 1
const POSITION_UNAVAILABLE = 2

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
  'BackgroundGeolocation',
)

/** True inside the Android/iOS shell, where the native plugin is available. */
function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * True when recording survives a locked screen or a switch to another app.
 * Only the native shell can do that; in the browser the screen must stay on.
 */
export function canTrackInBackground(): boolean {
  return isNative()
}

export function isLocationSupported(): boolean {
  return isNative() || 'geolocation' in navigator
}

/**
 * Native path. A watcher with `backgroundMessage` runs as an Android
 * foreground service (with a persistent notification), so fixes keep arriving
 * while the screen is locked or another app is in front, which the browser's
 * watchPosition cannot do.
 */
function watchNative(
  onFix: (point: GeoPoint) => void,
  onError: (err: LocationError) => void,
): StopWatching {
  let watcherId: string | null = null
  let stopped = false

  BackgroundGeolocation.addWatcher(
    {
      backgroundTitle: 'Sprtan',
      backgroundMessage: 'Sedang merekam lari.',
      requestPermissions: true,
      // Stale fixes from before the run would anchor the track to wherever
      // the phone last was, same reason the web path uses maximumAge: 0.
      stale: false,
      distanceFilter: 0,
    },
    (location, error) => {
      if (error) {
        onError({
          code: error.code === 'NOT_AUTHORIZED' ? PERMISSION_DENIED : POSITION_UNAVAILABLE,
          message: error.message,
        })
        return
      }
      if (!location) return
      onFix({
        lat: location.latitude,
        lng: location.longitude,
        t: location.time ?? Date.now(),
        alt: location.altitude ?? undefined,
        acc: location.accuracy,
      })
    },
  )
    .then((id) => {
      // stop() may have run while addWatcher was still resolving.
      if (stopped) void BackgroundGeolocation.removeWatcher({ id })
      else watcherId = id
    })
    .catch((err: unknown) => {
      onError({
        code: POSITION_UNAVAILABLE,
        message: err instanceof Error ? err.message : String(err),
      })
    })

  return () => {
    stopped = true
    if (watcherId != null) void BackgroundGeolocation.removeWatcher({ id: watcherId })
    watcherId = null
  }
}

function watchWeb(
  onFix: (point: GeoPoint) => void,
  onError: (err: LocationError) => void,
): StopWatching {
  const id = navigator.geolocation.watchPosition(
    (pos) =>
      onFix({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        t: pos.timestamp,
        alt: pos.coords.altitude ?? undefined,
        acc: pos.coords.accuracy ?? undefined,
      }),
    (err) => onError({ code: err.code, message: err.message }),
    // maximumAge: 0 — a cached fix from before the run started is stale by
    // definition and would anchor the track to wherever the phone last was.
    { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
  )
  return () => navigator.geolocation.clearWatch(id)
}

/**
 * Starts streaming raw location fixes from the best backend available: the
 * native background plugin inside the Capacitor shell, the browser's
 * Geolocation API otherwise. Returns a function that stops the stream.
 */
export function watchLocation(
  onFix: (point: GeoPoint) => void,
  onError: (err: LocationError) => void,
): StopWatching {
  return isNative() ? watchNative(onFix, onError) : watchWeb(onFix, onError)
}
