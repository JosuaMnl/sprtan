import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/database'
import type { RunSummary } from '../../db/types'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState, StatRow, buttonClass } from '../../components/ui/primitives'
import { Icon } from '../../components/ui/Icon'
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
import { runTitle } from './shareCard'
import './run.css'

export function RunHistoryPage() {
  const { unit } = useUnit()
  const runs = useLiveQuery(
    () => db.runs.orderBy('startedAt').reverse().toArray(),
    [],
    [],
  ) as RunSummary[]

  const totals = useMemo(() => {
    const distanceM = runs.reduce((sum, r) => sum + r.distanceM, 0)
    const durationMs = runs.reduce((sum, r) => sum + r.durationMs, 0)
    return { count: runs.length, distanceM, durationMs }
  }, [runs])

  const hasRuns = totals.count > 0

  return (
    <div>
      <PageHeader
        lead="Riwayat"
        title="Lari"
        actions={
          <Link to="/run/track" className={buttonClass()}>
            <Icon name="play" size={18} className="btn__icon" />
            Mulai Lari
          </Link>
        }
      />

      {!hasRuns ? (
        <EmptyState title="Belum ada lari tercatat.">
          <p>Lacak lari pertamamu. Rute, jarak, dan pace tersimpan di perangkat ini.</p>
          <Link to="/run/track" className={buttonClass()}>
            Mulai Lari
          </Link>
        </EmptyState>
      ) : (
        <>
          <section className="run-totals-card" aria-labelledby="run-total-label">
            <div className="run-totals-card__main">
              <h2 id="run-total-label" className="run-totals-card__label">
                Total jarak
              </h2>
              <p className="run-totals-card__value">
                <span className="num-display">
                  {metersToDisplay(totals.distanceM, unit).toFixed(1)}
                </span>
                <span className="run-totals-card__unit">{DISTANCE_UNIT_LABEL[unit]}</span>
              </p>
            </div>
            <StatRow
              items={[
                { label: 'Total lari', value: totals.count },
                { label: 'Total waktu', value: formatDuration(totals.durationMs) },
              ]}
            />
          </section>

          <ul className="run-list">
            {runs.map((r) => {
              const pace = paceSecPerKm(r.distanceM, r.durationMs)
              return (
                <li key={r.id}>
                  <Link to={`/run/${r.id}`} className="run-list__row">
                    <div className="run-list__meta">
                      <span className="run-list__title">{runTitle(r.startedAt)}</span>
                      <span className="run-list__date">{formatDate(r.date)}</span>
                    </div>
                    <div className="run-list__nums">
                      <span className="run-list__dist">
                        <span className="num-display">{formatDistance(r.distanceM, unit)}</span>
                        <span className="run-list__unit">{DISTANCE_UNIT_LABEL[unit]}</span>
                      </span>
                      <span className="run-list__sub">
                        <span className="pace-pill pace-pill--sm">
                          <span className="num">{formatPace(pace, unit)}</span>
                          <span className="pace-pill__unit">{PACE_UNIT_LABEL[unit]}</span>
                        </span>
                        <span className="num">{formatDuration(r.durationMs)}</span>
                      </span>
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
