import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db/database'
import type { Run } from '../../db/types'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, EmptyState, StatTile } from '../../components/ui/primitives'
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
import './run.css'

export function RunDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { unit } = useUnit()
  const navigate = useNavigate()

  const run = useLiveQuery(
    () => (id ? db.runs.get(id) : undefined),
    [id],
  ) as Run | undefined

  // Distinguish "still loading" from "no such run".
  const loaded = run !== undefined || id === undefined

  async function handleDelete() {
    if (!run) return
    if (!confirm(`Hapus lari ${formatDate(run.date)}? Tindakan ini tidak bisa dibatalkan.`)) {
      return
    }
    await db.runs.delete(run.id)
    navigate('/run')
  }

  if (loaded && !run) {
    return (
      <div>
        <PageHeader eyebrow="DROMOS" title="Lari" />
        <EmptyState title="Lari tidak ditemukan.">
          <p>Catatan ini mungkin sudah dihapus.</p>
          <Link to="/run">
            <Button>Kembali ke Daftar</Button>
          </Link>
        </EmptyState>
      </div>
    )
  }

  if (!run) {
    return (
      <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
        Memuat…
      </p>
    )
  }

  const pace = paceSecPerKm(run.distanceM, run.durationMs)

  return (
    <div>
      <PageHeader
        eyebrow="DROMOS"
        title={formatDate(run.date)}
        actions={
          <Button variant="danger" size="sm" onClick={handleDelete}>
            Hapus
          </Button>
        }
      />

      <RunMap path={run.path} mode="fit" className="run-map--detail" />

      <div className="run-totals">
        <Card className="run-totals__tile" hover>
          <StatTile
            label="Jarak"
            value={<span className="num">{formatDistance(run.distanceM, unit)}</span>}
            unit={DISTANCE_UNIT_LABEL[unit]}
            accent
          />
        </Card>
        <Card className="run-totals__tile" hover>
          <StatTile
            label="Waktu"
            value={<span className="num">{formatDuration(run.durationMs)}</span>}
          />
        </Card>
        <Card className="run-totals__tile" hover>
          <StatTile
            label="Pace"
            value={<span className="num">{formatPace(pace, unit)}</span>}
            unit={PACE_UNIT_LABEL[unit]}
          />
        </Card>
        <Card className="run-totals__tile" hover>
          <StatTile
            label="Elevasi"
            value={<span className="num">{Math.round(run.elevationGainM)}</span>}
            unit="m"
          />
        </Card>
      </div>

      <p className="run-detail__foot">
        Direkam {run.path.length} titik GPS ·{' '}
        <Link to="/run" className="run-detail__back">
          Semua lari
        </Link>
      </p>
    </div>
  )
}
