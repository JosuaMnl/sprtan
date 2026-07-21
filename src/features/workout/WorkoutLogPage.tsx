import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, makeId } from '../../db/database'
import type { Exercise, SetEntry, Workout } from '../../db/types'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, EmptyState } from '../../components/ui/primitives'
import { todayISO, formatDate } from '../../lib/format'
import { ExerciseBlock } from './ExerciseBlock'
import './workout.css'

export function WorkoutLogPage() {
  const [date, setDate] = useState(todayISO())
  const [pickExercise, setPickExercise] = useState('')
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

  function addExerciseBlock() {
    if (!pickExercise || blocks.includes(pickExercise)) {
      setPickExercise('')
      return
    }
    setPendingBlocks((prev) => [...prev, pickExercise])
    setPickExercise('')
  }

  const available = exercises
    .filter((e) => !blocks.includes(e.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <PageHeader
        eyebrow="MEDAN LATIHAN"
        title="Catat Latihan"
        actions={
          <div className="field log-date">
            <label className="field__label" htmlFor="log-date">
              Tanggal
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

      <p className="log-caption">{formatDate(date)}</p>

      <Card className="log-add-card">
        <div className="log-add">
          <div className="field log-add__select">
            <label className="field__label" htmlFor="add-ex">
              Tambah gerakan ke sesi
            </label>
            <select
              id="add-ex"
              className="select"
              value={pickExercise}
              onChange={(e) => setPickExercise(e.target.value)}
            >
              <option value="">— pilih gerakan —</option>
              {available.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={addExerciseBlock} disabled={!pickExercise}>
            Tambah
          </Button>
        </div>
      </Card>

      {blocks.length === 0 ? (
        <EmptyState title="Sesi masih kosong.">
          <p>Pilih gerakan di atas dan mulai menempa rekormu.</p>
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
