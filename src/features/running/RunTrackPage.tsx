import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { db, makeId } from '../../db/database'
import type { Run } from '../../db/types'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, StatRow } from '../../components/ui/primitives'
import { Icon } from '../../components/ui/Icon'
import { useUnit } from '../../settings/UnitContext'
import {
  DISTANCE_UNIT_LABEL,
  PACE_UNIT_LABEL,
  formatDistance,
  formatDuration,
  formatPace,
} from '../../lib/distance'
import { DEFAULT_MAX_ACCURACY_M, paceSecPerKm } from '../../lib/geo'
import { partOfDay, todayISO } from '../../lib/format'
import { useRunTracker, type RunStatus } from './useRunTracker'
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

/** Header status line per tracker phase ("● SEDANG LARI · 24:16"). */
const STATUS_COPY: Record<RunStatus, { label: string; dot: string }> = {
  idle: { label: 'Siap', dot: 'status-dot--muted' },
  tracking: { label: 'Sedang lari', dot: '' },
  paused: { label: 'Dijeda', dot: 'status-dot--accent' },
  finished: { label: 'Selesai', dot: 'status-dot--muted' },
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

  const dayPart = partOfDay(new Date(tracker.startedAt ?? Date.now()).getHours())
  // "Lari / Pagi" while running, "Lari / Selesai" once stopped.
  const title = isFinished ? 'Selesai' : dayPart.charAt(0).toUpperCase() + dayPart.slice(1)
  const phase = STATUS_COPY[tracker.status]

  const stats = [
    { label: 'Waktu', value: formatDuration(tracker.elapsedMs) },
    ...(isFinished
      ? []
      : [{ label: 'Pace rata²', value: formatPace(avgPace, unit), unit: PACE_UNIT_LABEL[unit] }]),
    { label: 'Elevasi', value: Math.round(tracker.elevationGainM), unit: 'm' },
  ]

  return (
    <div className="run-track">
      <div className="run-track__readout">
        <PageHeader
          back={isActive ? undefined : { to: '/run', label: 'Riwayat' }}
          lead="Lari"
          title={title}
          status={
            <>
              <span className={`status-dot ${phase.dot}`} aria-hidden="true" />
              {phase.label}
              <span className="status-sep">·</span>
              <span className="num">{formatDuration(tracker.elapsedMs)}</span>
            </>
          }
        />

        {(tracker.error || saveError) && (
          <div className="run-alert" role="alert">
            {saveError ?? tracker.error}
          </div>
        )}

        <div className="run-live">
          <p className="run-live__primary">
            <span className="run-live__value num-display">
              {formatDistance(tracker.distanceM, unit)}
            </span>
            <span className="run-live__unit">{DISTANCE_UNIT_LABEL[unit]}</span>
          </p>

          <p className="pace-pill">
            <Icon name="clock" size={18} />
            <span className="visually-hidden">{isFinished ? 'Pace rata-rata' : 'Pace kini'}</span>
            <span className="num">{formatPace(livePace, unit)}</span>
            <span className="pace-pill__unit">{PACE_UNIT_LABEL[unit]}</span>
          </p>

          {isActive && (
            <p className="run-live__signal">
              <span className={`run-signal run-signal--${signal.level}`} aria-hidden="true" />
              <span>{signal.label}</span>
              {tracker.autoPaused && <span className="run-live__badge">Jeda otomatis</span>}
            </p>
          )}

          <StatRow className="run-live__stats" items={stats} />
        </div>
      </div>

      <RunMap
        path={tracker.path}
        current={tracker.current}
        mode={isFinished ? 'fit' : 'follow'}
        className="run-map--track"
      />

      <div className="run-track__actions">
        <div className="run-controls">
          {tracker.status === 'idle' && (
            <Button size="lg" block onClick={tracker.start}>
              <Icon name="play" className="btn__icon" />
              Mulai Lari
            </Button>
          )}

          {tracker.status === 'tracking' && (
            <>
              <Button variant="ghost" size="lg" onClick={tracker.pause}>
                <Icon name="pause" className="btn__icon" />
                Jeda
              </Button>
              <Button size="lg" onClick={tracker.stop}>
                <Icon name="stop" className="btn__icon" />
                Selesai
              </Button>
            </>
          )}

          {tracker.status === 'paused' && (
            <>
              <Button variant="ghost" size="lg" onClick={tracker.resume}>
                <Icon name="play" className="btn__icon" />
                Lanjut
              </Button>
              <Button size="lg" onClick={tracker.stop}>
                <Icon name="stop" className="btn__icon" />
                Selesai
              </Button>
            </>
          )}

          {isFinished && (
            <>
              <Button variant="ghost" size="lg" onClick={discard} disabled={saving}>
                Buang
              </Button>
              <Button size="lg" onClick={saveRun} disabled={!canSave || saving}>
                {saving ? 'Menyimpan…' : 'Simpan Lari'}
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
    </div>
  )
}
