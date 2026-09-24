import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, makeId } from '../../db/database'
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  type Exercise,
  type SetEntry,
  type Workout,
} from '../../db/types'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, EmptyState } from '../../components/ui/primitives'
import { Icon } from '../../components/ui/Icon'
import { todayISO, formatDate } from '../../lib/format'
import { ExerciseBlock } from './ExerciseBlock'
import './workout.css'

export function WorkoutLogPage() {
  const [date, setDate] = useState(todayISO())
  // Exercises added to the session that don't have any saved sets yet.
  const [pendingBlocks, setPendingBlocks] = useState<string[]>([])

  const exercises = useLiveQuery(() => db.exercises.toArray(), [], []) as Exercise[]
  const workout = useLiveQuery(
    () => db.workouts.where('date').equals(date).first(),
    [date],
  )
  const sets = useLiveQuery(
    () => (workout ? db.sets.where('workoutId').equals(workout.id).toArray() : []),
    [workout?.id],
    [],
  ) as SetEntry[]

  // Reset pending blocks whenever the selected day changes.
  useEffect(() => {
    setPendingBlocks([])
  }, [date])

  const exerciseById = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises],
  )

  // Exercises present via saved sets, in insertion order.
  const savedBlocks = useMemo(() => {
    const seen: string[] = []
    for (const s of sets) if (!seen.includes(s.exerciseId)) seen.push(s.exerciseId)
    return seen
  }, [sets])

  // Union of saved + pending, saved first.
  const blocks = useMemo(() => {
    const merged = [...savedBlocks]
    for (const id of pendingBlocks) if (!merged.includes(id)) merged.push(id)
    return merged
  }, [savedBlocks, pendingBlocks])

  async function ensureWorkout(): Promise<Workout> {
    const existing = await db.workouts.where('date').equals(date).first()
    if (existing) return existing
    const w: Workout = { id: makeId(), date, notes: '', createdAt: Date.now() }
    await db.workouts.add(w)
    return w
  }

  // Picking a movement adds it right away: one tap instead of pick + "Tambah".
  function addExerciseBlock(exerciseId: string) {
    if (!exerciseId || blocks.includes(exerciseId)) return
    setPendingBlocks((prev) => [...prev, exerciseId])
  }

  const availableByGroup = MUSCLE_GROUPS.map((g) => ({
    group: g,
    items: exercises
      .filter((e) => e.muscleGroup === g && !blocks.includes(e.id))
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.items.length > 0)

  return (
    <div>
      <PageHeader
        lead="Catat"
        title="Latihan"
        status={formatDate(date)}
        actions={
          <div className="field log-date">
            <label className="visually-hidden" htmlFor="log-date">
              Tanggal latihan
            </label>
            <input
              id="log-date"
              className="input"
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value || todayISO())}
            />
          </div>
        }
      />

      <Card className="log-add-card">
        <div className="field">
          <label className="field__label" htmlFor="add-ex">
            Tambah gerakan ke sesi
          </label>
          <select
            id="add-ex"
            className="select"
            value=""
            onChange={(e) => addExerciseBlock(e.target.value)}
          >
            <option value="">Pilih gerakan…</option>
            {availableByGroup.map(({ group, items }) => (
              <optgroup key={group} label={MUSCLE_GROUP_LABELS[group]}>
                {items.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <Link to="/exercises" className="log-manage">
          Gerakan tidak ada? Kelola daftar gerakan
          <Icon name="arrow" size={16} />
        </Link>
      </Card>

      {blocks.length === 0 ? (
        <EmptyState title="Sesi masih kosong.">
          <p>Pilih gerakan di atas, lalu catat set pertamamu.</p>
        </EmptyState>
      ) : (
        <div className="log-blocks">
          {blocks.map((exId) => {
            const ex = exerciseById.get(exId)
            if (!ex) return null
            return (
              <ExerciseBlock
                key={exId}
                exercise={ex}
                sets={sets.filter((s) => s.exerciseId === exId)}
                ensureWorkout={ensureWorkout}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
