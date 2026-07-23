import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
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
  metersToDisplay,
} from '../../lib/distance'
import { paceSecPerKm } from '../../lib/geo'
import { formatDate } from '../../lib/format'
import './run.css'

export function RunHistoryPage() {
  const { unit } = useUnit()
  const runs = useLiveQuery(
    () => db.runs.orderBy('startedAt').reverse().toArray(),
    [],
    [],
  ) as Run[]

  const totals = useMemo(() => {
    const distanceM = runs.reduce((sum, r) => sum + r.distanceM, 0)
    const durationMs = runs.reduce((sum, r) => sum + r.durationMs, 0)
    return { count: runs.length, distanceM, durationMs }
  }, [runs])

  const hasRuns = totals.count > 0

  return (
    <div>
      <PageHeader
        eyebrow="DROMOS"
        title="Lari"
        actions={
          <Link to="/run/track">
            <Button>Mulai Lari</Button>
          </Link>
        }
      />

      {!hasRuns ? (
        <EmptyState title="Belum ada lari tercatat.">
          <p>Peta menantimu, prajurit. Lacak lari pertamamu dan tempa jejakmu.</p>
          <Link to="/run/track">
            <Button>Mulai Lari</Button>
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="run-totals">
            <Card className="run-totals__tile" hover>
              <StatTile
                label="Total Jarak"
                value={
                  <span className="num">
                    {metersToDisplay(totals.distanceM, unit).toFixed(1)}
                  </span>
                }
                unit={DISTANCE_UNIT_LABEL[unit]}
                accent
              />
            </Card>
            <Card className="run-totals__tile" hover>
              <StatTile label="Total Lari" value={<span className="num">{totals.count}</span>} />
            </Card>
            <Card className="run-totals__tile" hover>
              <StatTile
                label="Total Waktu"
                value={<span className="num">{formatDuration(totals.durationMs)}</span>}
              />
            </Card>
          </div>

          <ul className="run-list">
            {runs.map((r) => {
              const pace = paceSecPerKm(r.distanceM, r.durationMs)
              return (
                <li key={r.id}>
                  <Link to={`/run/${r.id}`} className="run-list__row">
                    <div className="run-list__meta">
                      <span className="run-list__date">{formatDate(r.date)}</span>
                      <span className="run-list__pace num">
                        {formatPace(pace, unit)} {PACE_UNIT_LABEL[unit]}
                      </span>
                    </div>
                    <div className="run-list__nums">
                      <span className="num run-list__dist">
                        {formatDistance(r.distanceM, unit)}{' '}
                        <span className="run-list__unit">{DISTANCE_UNIT_LABEL[unit]}</span>
                      </span>
                      <span className="run-list__dur num">{formatDuration(r.durationMs)}</span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
