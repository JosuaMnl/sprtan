import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/database'
import type { Exercise, RunSummary, SetEntry, Workout } from '../../db/types'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, EmptyState, StatRow, buttonClass } from '../../components/ui/primitives'
import { Icon } from '../../components/ui/Icon'
import { computeAllPRs } from '../../lib/prCalculator'
import { setVolume, round1 } from '../../lib/oneRepMax'
import { useUnit } from '../../settings/UnitContext'
import { UNIT_LABEL, toDisplayWeight } from '../../lib/units'
import { DISTANCE_UNIT_LABEL, metersToDisplay } from '../../lib/distance'
import { formatDate, partOfDay, todayISO } from '../../lib/format'
import './dashboard.css'

/** Days in the "active days" ring (today and the six before it). */
const WEEK_DAYS = 7

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

function activeDaysCopy(days: number): string {
  if (days === 0) return 'Belum ada latihan atau lari dalam 7 hari ini.'
  if (days >= WEEK_DAYS) return 'Tujuh hari penuh. Jangan lupa istirahat.'
  return `${days} dari 7 hari terakhir kamu bergerak.`
}

export function DashboardPage() {
  const { unit } = useUnit()
  const workouts = useLiveQuery(() => db.workouts.toArray(), [], []) as Workout[]
  const sets = useLiveQuery(() => db.sets.toArray(), [], []) as SetEntry[]
  const exercises = useLiveQuery(() => db.exercises.toArray(), [], []) as Exercise[]
  const runs = useLiveQuery(() => db.runs.toArray(), [], []) as RunSummary[]

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
      liftDates: activeDates,
    }
  }, [sets, workouts])

  const week = useMemo(() => {
    const from = isoDaysAgo(WEEK_DAYS - 1)
    const recentRuns = runs.filter((r) => r.date >= from)
    const days = new Set<string>(recentRuns.map((r) => r.date))
    for (const d of stats.liftDates) if (d >= from) days.add(d)
    return {
      activeDays: Math.min(days.size, WEEK_DAYS),
      runCount: recentRuns.length,
      runDistanceM: recentRuns.reduce((sum, r) => sum + r.distanceM, 0),
    }
  }, [runs, stats.liftDates])

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

  const hasData = stats.sessions > 0 || runs.length > 0
  const greeting = `Selamat ${partOfDay(new Date().getHours())},`
  const ringPct = Math.round((week.activeDays / WEEK_DAYS) * 100)
  const weekVolume = Math.round(toDisplayWeight(stats.weekVolume, unit)).toLocaleString('id-ID')

  return (
    <div className="dash">
      <PageHeader
        lead={greeting}
        title="siap latihan?"
        status={
          <>
            <span className="status-dot" aria-hidden="true" />
            Hari ini <span className="status-sep">·</span> {formatDate(todayISO())}
          </>
        }
      />

      {!hasData ? (
        <EmptyState title="Belum ada catatan.">
          <p>Setiap progres dimulai dari set pertama. Catat latihanmu untuk mengisi beranda ini.</p>
          <Link to="/log" className={buttonClass()}>
            Mulai Sekarang
          </Link>
        </EmptyState>
      ) : (
        <div className="dash__grid">
          <section className="hero-card" aria-labelledby="hero-label">
            <svg className="hero-card__mark" viewBox="0 0 64 64" aria-hidden="true">
              <path d="M32 6 L54 58 L43 58 L32 28 L21 58 L10 58 Z" />
            </svg>
            <h2 id="hero-label" className="hero-card__label">
              Volume pekan ini
            </h2>
            <p className="hero-card__value">
              <span className="num-display">{weekVolume}</span>
              <span className="hero-card__unit">{UNIT_LABEL[unit]}</span>
            </p>
            <StatRow
              className="hero-card__stats"
              items={[
                { label: 'Sesi', value: stats.sessions },
                { label: 'Rekor', value: stats.prCount },
                {
                  label: 'Total volume',
                  value: round1(toDisplayWeight(stats.totalVolume, unit) / 1000),
                  unit: unit === 'kg' ? 'ton' : 'k lb',
                },
              ]}
            />
          </section>

          <Card className="goal-card">
            <div className="goal-card__text">
              <h2 className="card-label">Hari aktif</h2>
              <p className="goal-card__value">
                <span className="num-display">{week.activeDays}</span>
                <span className="goal-card__of num">/ {WEEK_DAYS} hari</span>
              </p>
              <p className="goal-card__copy">{activeDaysCopy(week.activeDays)}</p>
            </div>
            <div
              className="ring"
              role="img"
              aria-label={`${week.activeDays} dari ${WEEK_DAYS} hari aktif`}
            >
              <svg viewBox="0 0 44 44" className="ring__svg" aria-hidden="true">
                <circle className="ring__track" cx="22" cy="22" r="17" pathLength={100} />
                <circle
                  className="ring__fill"
                  cx="22"
                  cy="22"
                  r="17"
                  pathLength={100}
                  strokeDasharray={`${ringPct} 100`}
                />
              </svg>
              <span className="ring__pct num">{ringPct}%</span>
            </div>
          </Card>

          <Link to="/run" className="run-card">
            <div>
              <h2 className="card-label">Lari 7 hari terakhir</h2>
              <p className="run-card__value">
                <span className="num-display">
                  {metersToDisplay(week.runDistanceM, unit).toFixed(1)}
                </span>
                <span className="run-card__unit">{DISTANCE_UNIT_LABEL[unit]}</span>
              </p>
              <p className="run-card__meta num">
                {week.runCount} lari <span className="status-sep">·</span> lihat riwayat
              </p>
            </div>
            <span className="run-card__go" aria-hidden="true">
              <Icon name="arrow" size={20} />
            </span>
          </Link>

          <Card className="recent-card">
            <h2 className="recent-card__title">Latihan terakhir</h2>
            {recent.length === 0 ? (
              <p className="recent-card__empty">Belum ada sesi angkat beban.</p>
            ) : (
              <ul className="recent">
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
                        <span className="recent__unit">{UNIT_LABEL[unit]}</span>
                      </span>
                      <span className="recent__sets num">{r.sets} set</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="dash__cta">
            <Link to="/log" className={buttonClass({ size: 'lg', block: true })}>
              Catat Latihan
              <Icon name="arrow" size={20} className="btn__icon" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
