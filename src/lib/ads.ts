/**
 * The AdSense command queue. Before the loader script runs it is a plain array
 * that the script picks up; `pauseAdRequests` is AdSense's documented switch
 * for holding (1) and resuming (0) ad requests, and it works in either state.
 */
type AdsQueue = unknown[] & { pauseAdRequests?: 0 | 1 }

/**
 * Hold or resume AdSense ad requests.
 *
 * Auto ads can only be excluded per URL from the AdSense dashboard, and it does
 * not support URLs with a `#` fragment, which every route here has (hash
 * router). Pausing from code is the only per-screen control available. The
 * inline script in index.html applies the same pause when the app opens
 * straight onto the run tracker, before this module has loaded.
 */
export function setAdRequestsPaused(paused: boolean): void {
  const w = window as Window & { adsbygoogle?: AdsQueue }
  const queue = w.adsbygoogle ?? []
  queue.pauseAdRequests = paused ? 1 : 0
  w.adsbygoogle = queue
}
