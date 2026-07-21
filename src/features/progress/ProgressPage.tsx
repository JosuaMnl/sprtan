import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '../../db/database'
import type { Exercise, SetEntry, Workout } from '../../db/types'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, EmptyState } from '../../components/ui/primitives'
import {
  METRIC_LABELS,
  buildProgressSeries,
  type ProgressMetric,
} from '../../lib/progress'
import { useUnit } from '../../settings/UnitContext'
import { UNIT_LABEL, toDisplayWeight } from '../../lib/units'
import { formatDateShort } from '../../lib/format'
import './progress.css'

const METRICS: ProgressMetric[] = ['est1RM', 'maxWeight', 'volume']

export function ProgressPage() {
  const { unit } = useUnit()
  const exercises = useLiveQuery(() => db.exercises.toArray(), [], []) as Exercise[]
  const workouts = useLiveQuery(() => db.workouts.toArray(), [], []) as Workout[]
  const [exerciseId, setExerciseId] = useState('')
  const [metric, setMetric] = useState<ProgressMetric>('est1RM')

  const sortedExercises = useMemo(
    () => [...exercises].sort((a, b) => a.name.localeCompare(b.name)),
    [exercises],
  )

  const selected = exerciseId || sortedExercises[0]?.id || ''

  const sets = useLiveQuery(
    () => (selected ? db.sets.where('exerciseId').equals(selected).toArray() : []),
    [selected],
    [],
  ) as SetEntry[]

  const series = useMemo(
    () => buildProgressSeries(sets, workouts, metric),
    [sets, workouts, metric],
  )

  const chartData = series.map((p) => ({
    date: p.date,
    label: formatDateShort(p.date),
    value: toDisplayWeight(p.value, unit),
  }))
  const selectedName = exercises.find((e) => e.id === selected)?.name ?? ''

  return (
    <div>
      <PageHeader eyebrow="JEJAK PENAKLUKAN" title="Progres" />

      <div className="progress-controls">
        <div className="field progress-controls__ex">
          <label className="field__label" htmlFor="prog-ex">
            Gerakan
          </label>
          <select
            id="prog-ex"
            className="select"
            value={selected}
            onChange={(e) => setExerciseId(e.target.value)}
          >
            {sortedExercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div
          className="metric-tabs"
          role="tablist"
          aria-label="Metrik"
        >
          {METRICS.map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={metric === m}
              className={`metric-tab ${metric === m ? 'is-active' : ''}`}
              onClick={() => setMetric(m)}
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <Card className="chart-card">
        {chartData.length === 0 ? (
          <EmptyState title="Belum ada data.">
            <p>Catat beberapa set {selectedName ? `untuk ${selectedName}` : ''} untuk melihat kurva progresmu.</p>
          </EmptyState>
        ) : (
          <>
            <div className="chart-head">
              <h2 className="chart-head__title">{selectedName}</h2>
              <span className="chart-head__metric num">
                {METRIC_LABELS[metric]} · {UNIT_LABEL[unit]}
              </span>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
                  <CartesianGrid stroke="var(--color-line)" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--color-ink-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                    stroke="var(--color-line)"
                  />
                  <YAxis
                    tick={{ fill: 'var(--color-ink-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                    stroke="var(--color-line)"
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-paper-3)',
                      border: '1px solid var(--color-bronze-dim)',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-ink)',
                    }}
                    labelStyle={{ color: 'var(--color-bronze)' }}
                    cursor={{ stroke: 'var(--color-bronze-dim)', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={METRIC_LABELS[metric]}
                    stroke="var(--color-accent-hi)"
                    strokeWidth={2.5}
                    dot={{ fill: 'var(--color-bronze)', r: 3 }}
                    activeDot={{ r: 5, fill: 'var(--color-accent-hi)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
