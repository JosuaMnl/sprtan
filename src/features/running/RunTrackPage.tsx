import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { db, makeId } from '../../db/database'
import type { Run } from '../../db/types'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/primitives'
import { useUnit } from '../../settings/UnitContext'
import {
  DISTANCE_UNIT_LABEL,
  PACE_UNIT_LABEL,
  formatDistance,
  formatDuration,
  formatPace,
} from '../../lib/distance'
import { DEFAULT_MAX_ACCURACY_M, paceSecPerKm } from '../../lib/geo'
import { todayISO } from '../../lib/format'
import { useRunTracker } from './useRunTracker'
import { RunMap } from './RunMap'
import './run.css'

/**
 * Turn the newest fix's accuracy radius into something a runner can act on.
 * Fixes worse than the recording threshold are dropped rather than recorded, so
 * "Mencari sinyal" genuinely means "nothing is being logged yet" — worth saying
 * out loud, because a run that silently records nothing for its first minutes
 * is the most common way a tracked distance ends up short.
 */
function gpsSignal(
  ready: boolean,
  accuracyM: number | null,
): { level: 'searching' | 'weak' | 'ok' | 'strong'; label: string } {
  if (!ready || accuracyM == null) {
    return { level: 'searching', label: 'Mencari sinyal GPS…' }
  }
  const acc = Math.round(accuracyM)
  if (accuracyM > DEFAULT_MAX_ACCURACY_M) {
    return { level: 'weak', label: `Sinyal lemah · ±${acc} m` }
  }
  if (accuracyM > 10) return { level: 'ok', label: `GPS cukup · ±${acc} m` }
  return { level: 'strong', label: `GPS kuat · ±${acc} m` }
}

export function RunTrackPage() {
  const { unit } = useUnit()
  const navigate = useNavigate()
  const tracker = useRunTracker()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const isActive = tracker.status === 'tracking' || tracker.status === 'paused'
  const isFinished = tracker.status === 'finished'
  // Two different questions: "how fast am I running right now" (rolling window,
  // what a running watch shows) and "how fast was this run" (whole-run average).
  // Showing only the average is why the live readout felt unresponsive.
  const avgPace = paceSecPerKm(tracker.distanceM, tracker.elapsedMs)
  const livePace = isFinished ? avgPace : tracker.paceSecPerKm
  const signal = gpsSignal(tracker.gpsReady, tracker.accuracyM)

  // Set just before an intentional navigation (save/discard) so the guards
  // below don't prompt the user about leaving during our own redirect.
  const bypassGuard = useRef(false)

  // Warn on tab close / reload while a run is in progress — the whole run lives
  // only in memory until "Simpan".
  useEffect(() => {
    if (!isActive) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isActive])

  // Guard in-app navigation (nav taps, back button) while tracking/paused.
  const blocker = useBlocker(
    () => isActive && !bypassGuard.current,
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    const leave = window.confirm(
      'Lari masih berjalan. Tinggalkan halaman? Jejak yang belum disimpan akan hilang.',
    )
    if (leave) {
      tracker.reset()
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker, tracker])

  async function saveRun() {
    if (tracker.path.length < 2 || tracker.distanceM <= 0) return
    setSaving(true)
    setSaveError(null)
    try {
      const startedAt = tracker.startedAt ?? Date.now()
      const run: Run = {
        id: makeId(),
        date: todayISO(),
        startedAt,
        durationMs: tracker.elapsedMs,
        totalMs: tracker.totalElapsedMs,
        distanceM: tracker.distanceM,
        elevationGainM: tracker.elevationGainM,
        path: tracker.path,
        notes: '',
        createdAt: Date.now(),
      }
      await db.runs.add(run)
      bypassGuard.current = true
      tracker.reset()
      navigate(`/run/${run.id}`)
    } catch {
      setSaveError(
        'Gagal menyimpan lari. Ruang penyimpanan mungkin penuh — coba lagi.',
      )
    } finally {
      setSaving(false)
    }
  }

  function discard() {
    bypassGuard.current = true
    tracker.reset()
    navigate('/run')
  }
  const canSave = isFinished && tracker.path.length >= 2 && tracker.distanceM > 0

  return (
    <div className="run-track">
      <PageHeader
        eyebrow="DROMOS"
        title={isFinished ? 'Lari Selesai' : 'Melacak Lari'}
      />

      {(tracker.error || saveError) && (
        <div className="run-alert" role="alert">
          {saveError ?? tracker.error}
        </div>
      )}

      <div className="run-live">
        <div className="run-live__primary">
          <span className="run-live__value num">{formatDistance(tracker.distanceM, unit)}</span>
          <span className="run-live__unit">{DISTANCE_UNIT_LABEL[unit]}</span>
        </div>

        {isActive && (
          <div className="run-live__signal">
            <span className={`run-signal run-signal--${signal.level}`} aria-hidden="true" />
            <span>{signal.label}</span>
            {tracker.autoPaused && (
              <span className="run-live__badge">Jeda otomatis</span>
            )}
          </div>
        )}

        <div className="run-live__secondary">
          <div className="run-live__stat">
            <span className="run-live__stat-label">Waktu</span>
            <span className="run-live__stat-value num">{formatDuration(tracker.elapsedMs)}</span>
          </div>
          <div className="run-live__stat">
            <span className="run-live__stat-label">{isFinished ? 'Pace' : 'Pace Kini'}</span>
            <span className="run-live__stat-value num">
              {formatPace(livePace, unit)}
              <span className="run-live__stat-unit"> {PACE_UNIT_LABEL[unit]}</span>
            </span>
          </div>
          {!isFinished && (
            <div className="run-live__stat">
              <span className="run-live__stat-label">Pace Rata²</span>
              <span className="run-live__stat-value num">
                {formatPace(avgPace, unit)}
                <span className="run-live__stat-unit"> {PACE_UNIT_LABEL[unit]}</span>
              </span>
            </div>
          )}
          <div className="run-live__stat">
            <span className="run-live__stat-label">Elevasi</span>
            <span className="run-live__stat-value num">
              {Math.round(tracker.elevationGainM)}
              <span className="run-live__stat-unit"> m</span>
            </span>
          </div>
        </div>
      </div>

      <RunMap
        path={tracker.path}
        current={tracker.current}
        mode={isFinished ? 'fit' : 'follow'}
        className="run-map--track"
      />

      <div className="run-controls">
        {tracker.status === 'idle' && (
          <Button onClick={tracker.start}>Mulai</Button>
        )}

        {tracker.status === 'tracking' && (
          <>
            <Button variant="ghost" onClick={tracker.pause}>
              Jeda
            </Button>
            <Button variant="danger" onClick={tracker.stop}>
              Selesai
            </Button>
          </>
        )}

        {tracker.status === 'paused' && (
          <>
            <Button onClick={tracker.resume}>Lanjut</Button>
            <Button variant="danger" onClick={tracker.stop}>
              Selesai
            </Button>
          </>
        )}

        {isFinished && (
          <>
            <Button onClick={saveRun} disabled={!canSave || saving}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </Button>
            <Button variant="ghost" onClick={discard} disabled={saving}>
              Buang
            </Button>
          </>
        )}
      </div>

      {isFinished && (
        <p className="run-hint">
          Waktu bergerak {formatDuration(tracker.elapsedMs)} dari total{' '}
          {formatDuration(tracker.totalElapsedMs)} · {tracker.path.length} titik GPS
        </p>
      )}
      {isFinished && !canSave && (
        <p className="run-hint">Jarak terlalu pendek untuk disimpan.</p>
      )}
      {isActive && (
        <p className="run-hint">
          Jam berhenti otomatis saat kamu berhenti bergerak. Biarkan layar
          menyala agar GPS terus merekam jejakmu.
        </p>
      )}
    </div>
  )
}
