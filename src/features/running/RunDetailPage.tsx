import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteRun, getRun } from '../../db/runs'
import type { Run } from '../../db/types'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, EmptyState, StatRow, buttonClass } from '../../components/ui/primitives'
import { Icon } from '../../components/ui/Icon'
import { useUnit } from '../../settings/UnitContext'
import {
  DISTANCE_UNIT_LABEL,
  PACE_UNIT_LABEL,
  formatDistance,
  formatDuration,
  formatPace,
} from '../../lib/distance'
import { paceSecPerKm } from '../../lib/geo'
import { formatDate } from '../../lib/format'
import { RunMap } from './RunMap'
import { RunShareDialog } from './RunShareDialog'
import { runTitle } from './shareCard'
import './run.css'

/** Sentinel distinguishing "query not resolved yet" from "run not found". */
const PENDING = Symbol('pending')

export function RunDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { unit } = useUnit()
  const navigate = useNavigate()
  const [sharing, setSharing] = useState(false)

  // `useLiveQuery` only re-renders when the new value differs (by ===) from the
  // stored one. Its stored default is undefined, and a missing run also resolves
  // to undefined — so without a distinct sentinel the "not found" case would
  // never re-render and the page would hang on "Memuat…" forever.
  const queried = useLiveQuery(
    () => (id ? getRun(id) : undefined),
    [id],
    PENDING,
  ) as Run | undefined | typeof PENDING

  const isLoading = queried === PENDING
  const run = queried === PENDING ? undefined : queried

  async function handleDelete() {
    if (!run) return
    if (!confirm(`Hapus lari ${formatDate(run.date)}? Tindakan ini tidak bisa dibatalkan.`)) {
      return
    }
    await deleteRun(run.id)
    navigate('/run')
  }

  if (isLoading) {
    return (
      <p className="loading">Memuat…</p>
    )
  }

  if (!run) {
    return (
      <div>
        <PageHeader lead="Detail" title="Lari" back={{ to: '/run', label: 'Semua lari' }} />
        <EmptyState title="Lari tidak ditemukan.">
          <p>Catatan ini mungkin sudah dihapus.</p>
          <Link to="/run" className={buttonClass()}>
            Kembali ke Daftar
          </Link>
        </EmptyState>
      </div>
    )
  }

  const pace = paceSecPerKm(run.distanceM, run.durationMs)

  return (
    <div>
      <PageHeader
        lead={formatDate(run.date)}
        title={runTitle(run.startedAt)}
        back={{ to: '/run', label: 'Semua lari' }}
        actions={
          <div className="run-detail__actions">
            <Button size="sm" onClick={() => setSharing(true)}>
              <Icon name="share" size={16} className="btn__icon" />
              Bagikan
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Icon name="trash" size={16} className="btn__icon" />
              Hapus
            </Button>
          </div>
        }
      />

      {sharing && <RunShareDialog run={run} onClose={() => setSharing(false)} />}

      <div className="run-detail">
        <RunMap path={run.path} mode="fit" className="run-map--detail" />

        <Card className="run-detail__summary">
          <p className="run-detail__dist">
            <span className="num-display">{formatDistance(run.distanceM, unit)}</span>
            <span className="run-detail__unit">{DISTANCE_UNIT_LABEL[unit]}</span>
          </p>
          <p className="pace-pill">
            <Icon name="clock" size={18} />
            <span className="visually-hidden">Pace rata-rata</span>
            <span className="num">{formatPace(pace, unit)}</span>
            <span className="pace-pill__unit">{PACE_UNIT_LABEL[unit]}</span>
          </p>
          <StatRow
            items={[
              { label: 'Waktu', value: formatDuration(run.durationMs) },
              { label: 'Elevasi', value: Math.round(run.elevationGainM), unit: 'm' },
              { label: 'Titik GPS', value: run.path.length },
            ]}
          />
        </Card>
      </div>

      {run.totalMs != null && run.totalMs > run.durationMs && (
        <p className="run-detail__foot">
          Waktu total {formatDuration(run.totalMs)}, termasuk jeda otomatis.
        </p>
      )}
    </div>
  )
}
