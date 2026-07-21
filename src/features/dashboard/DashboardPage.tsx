import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/database'
import type { Exercise, SetEntry, Workout } from '../../db/types'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, EmptyState, StatTile } from '../../components/ui/primitives'
import { computeAllPRs } from '../../lib/prCalculator'
import { setVolume, round1 } from '../../lib/oneRepMax'
import { useUnit } from '../../settings/UnitContext'
import { UNIT_LABEL, toDisplayWeight } from '../../lib/units'
import { formatDate, todayISO } from '../../lib/format'
import './dashboard.css'

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

export function DashboardPage() {
  const { unit } = useUnit()
  const workouts = useLiveQuery(() => db.workouts.toArray(), [], []) as Workout[]
  const sets = useLiveQuery(() => db.sets.toArray(), [], []) as SetEntry[]
  const exercises = useLiveQuery(() => db.exercises.toArray(), [], []) as Exercise[]

  const exName = useMemo(
    () => new Map(exercises.map((e) => [e.id, e.name])),
    [exercises],
  )

  const stats = useMemo(() => {
    const weekAgo = isoDaysAgo(7)
    const validSets = sets.filter((s) => s.weight > 0 && s.reps > 0)
    const workoutDate = new Map(workouts.map((w) => [w.id, w.date]))

    let weekVolume = 0
    for (const s of validSets) {
      const date = workoutDate.get(s.workoutId)
      if (date && date >= weekAgo) weekVolume += setVolume(s.weight, s.reps)
    }

    const totalVolume = validSets.reduce((sum, s) => sum + setVolume(s.weight, s.reps), 0)
    const prs = computeAllPRs(validSets)

    // Distinct workout dates with at least one valid set.
    const activeDates = new Set(
      validSets.map((s) => workoutDate.get(s.workoutId)).filter(Boolean) as string[],
    )

    return {
      sessions: activeDates.size,
      weekVolume: Math.round(weekVolume),
      totalVolume: Math.round(totalVolume),
      prCount: prs.length,
    }
  }, [sets, workouts])

  const recent = useMemo(() => {
    const workoutDate = new Map(workouts.map((w) => [w.id, w.date]))
    const byWorkout = new Map<string, { sets: number; volume: number; exSet: Set<string> }>()
    for (const s of sets) {
      if (!(s.weight > 0 && s.reps > 0)) continue
      const entry = byWorkout.get(s.workoutId) ?? {
        sets: 0,
        volume: 0,
        exSet: new Set<string>(),
      }
      entry.sets += 1
      entry.volume += setVolume(s.weight, s.reps)
      entry.exSet.add(s.exerciseId)
      byWorkout.set(s.workoutId, entry)
    }
    return [...byWorkout.entries()]
      .map(([id, e]) => ({
        id,
        date: workoutDate.get(id) ?? '',
        sets: e.sets,
        volume: Math.round(e.volume),
        exercises: [...e.exSet].map((x) => exName.get(x) ?? '').filter(Boolean),
      }))
      .filter((r) => r.date)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
  }, [sets, workouts, exName])

  const hasData = stats.sessions > 0

  return (
    <div>
      <PageHeader
        eyebrow="ΜΟΛΩΝ ΛΑΒΕ"
        title="Arena"
        actions={
          <Link to="/log">
            <Button>Catat Hari Ini</Button>
          </Link>
        }
      />

      {!hasData ? (
        <EmptyState title="Belum ada catatan.">
          <p>Setiap prajurit mulai dari set pertama. Catat latihanmu untuk membuka Arena.</p>
          <Link to="/log">
            <Button>Mulai Sekarang</Button>
          </Link>
        </EmptyState>
      ) : (
        <div className="bento">
          <Card className="bento__tile bento__tile--wide" hover>
            <StatTile
              label="Volume Pekan Ini"
              value={
                <span className="num">
                  {Math.round(toDisplayWeight(stats.weekVolume, unit)).toLocaleString('id-ID')}
                </span>
              }
              unit={UNIT_LABEL[unit]}
              accent
            />
            <p className="bento__sub">7 hari terakhir · sejak {formatDate(isoDaysAgo(7))}</p>
          </Card>

          <Card className="bento__tile" hover>
            <StatTile label="Sesi" value={<span className="num">{stats.sessions}</span>} />
          </Card>

          <Card className="bento__tile" hover>
            <StatTile
              label="Rekor Pribadi"
              value={<span className="num">{stats.prCount}</span>}
              accent
            />
          </Card>

          <Card className="bento__tile" hover>
            <StatTile
              label="Total Volume"
              value={
                <span className="num">
                  {round1(toDisplayWeight(stats.totalVolume, unit) / 1000)}
                </span>
              }
              unit={unit === 'kg' ? 'ton' : 'k lb'}
            />
          </Card>

          <Card className="bento__tile bento__tile--tall">
            <div className="recent">
              <h2 className="recent__title">Latihan Terakhir</h2>
              <ul className="recent__list">
                {recent.map((r) => (
                  <li key={r.id} className="recent__row">
                    <div className="recent__meta">
                      <span className="recent__date">{formatDate(r.date)}</span>
                      <span className="recent__ex">
                        {r.exercises.slice(0, 3).join(' · ')}
                        {r.exercises.length > 3 ? ` +${r.exercises.length - 3}` : ''}
                      </span>
                    </div>
                    <div className="recent__nums">
                      <span className="num recent__vol">
                        {Math.round(toDisplayWeight(r.volume, unit)).toLocaleString('id-ID')}{' '}
                        {UNIT_LABEL[unit]}
                      </span>
                      <span className="recent__sets num">{r.sets} set</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      )}

      <p className="dash-foot">Hari ini · {formatDate(todayISO())}</p>
    </div>
  )
}
