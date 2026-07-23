import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { paceSecPerKm } from '../../lib/geo'
import { todayISO } from '../../lib/format'
import { useRunTracker } from './useRunTracker'
import { RunMap } from './RunMap'
import './run.css'

export function RunTrackPage() {
  const { unit } = useUnit()
  const navigate = useNavigate()
  const tracker = useRunTracker()
  const [saving, setSaving] = useState(false)

  const pace = paceSecPerKm(tracker.distanceM, tracker.elapsedMs)

  async function saveRun() {
    if (tracker.path.length < 2 || tracker.distanceM <= 0) return
    setSaving(true)
    try {
      const startedAt = tracker.startedAt ?? Date.now()
      const run: Run = {
        id: makeId(),
        date: todayISO(),
        startedAt,
        durationMs: tracker.elapsedMs,
        distanceM: tracker.distanceM,
        elevationGainM: tracker.elevationGainM,
        path: tracker.path,
        notes: '',
        createdAt: Date.now(),
      }
      await db.runs.add(run)
      tracker.reset()
      navigate(`/run/${run.id}`)
    } finally {
      setSaving(false)
    }
  }

  function discard() {
    tracker.reset()
    navigate('/run')
  }

  const isActive = tracker.status === 'tracking' || tracker.status === 'paused'
  const isFinished = tracker.status === 'finished'
  const canSave = isFinished && tracker.path.length >= 2 && tracker.distanceM > 0

  return (
    <div className="run-track">
      <PageHeader
        eyebrow="DROMOS"
        title={isFinished ? 'Lari Selesai' : 'Melacak Lari'}
      />

      {tracker.error && (
        <div className="run-alert" role="alert">
          {tracker.error}
        </div>
      )}

      <div className="run-live">
        <div className="run-live__primary">
          <span className="run-live__value num">{formatDistance(tracker.distanceM, unit)}</span>
          <span className="run-live__unit">{DISTANCE_UNIT_LABEL[unit]}</span>
        </div>
        <div className="run-live__secondary">
          <div className="run-live__stat">
            <span className="run-live__stat-label">Waktu</span>
            <span className="run-live__stat-value num">{formatDuration(tracker.elapsedMs)}</span>
          </div>
          <div className="run-live__stat">
            <span className="run-live__stat-label">Pace</span>
            <span className="run-live__stat-value num">
              {formatPace(pace, unit)}
              <span className="run-live__stat-unit"> {PACE_UNIT_LABEL[unit]}</span>
            </span>
          </div>
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

      {isFinished && !canSave && (
        <p className="run-hint">Jarak terlalu pendek untuk disimpan.</p>
      )}
      {isActive && (
        <p className="run-hint">
          Biarkan layar tetap menyala agar GPS terus merekam jejakmu.
        </p>
      )}
    </div>
  )
}
