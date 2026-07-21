import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, makeId } from '../../db/database'
import type { Exercise, SetEntry } from '../../db/types'
import { Badge, Button } from '../../components/ui/primitives'
import { estimateOneRepMax, round1 } from '../../lib/oneRepMax'
import { computePR, isNewRecord } from '../../lib/prCalculator'
import { useUnit } from '../../settings/UnitContext'
import {
  UNIT_LABEL,
  WEIGHT_STEP,
  fromInputWeight,
  toDisplayWeight,
} from '../../lib/units'

interface ExerciseBlockProps {
  exercise: Exercise
  sets: SetEntry[]
  ensureWorkout: () => Promise<{ id: string }>
}

export function ExerciseBlock({ exercise, sets, ensureWorkout }: ExerciseBlockProps) {
  const { unit } = useUnit()
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [flashId, setFlashId] = useState<string | null>(null)

  // All historical sets for this exercise — used for PR context.
  const allSets = useLiveQuery(
    () => db.sets.where('exerciseId').equals(exercise.id).toArray(),
    [exercise.id],
    [],
  ) as SetEntry[]

  const historicalPR = computePR(exercise.id, allSets)
  const orderedSets = [...sets].sort((a, b) => a.order - b.order)

  async function addSet(e: React.FormEvent) {
    e.preventDefault()
    const w = Number(weight)
    const r = Number(reps)
    if (!(w > 0) || !(r > 0)) return

    const workout = await ensureWorkout()
    const priorSets = await db.sets.where('exerciseId').equals(exercise.id).toArray()
    const nextOrder = orderedSets.length
      ? Math.max(...orderedSets.map((s) => s.order)) + 1
      : 0

    const newSet: SetEntry = {
      id: makeId(),
      workoutId: workout.id,
      exerciseId: exercise.id,
      weight: fromInputWeight(w, unit),
      reps: r,
      order: nextOrder,
    }

    const record = isNewRecord(newSet, priorSets)
    await db.sets.add(newSet)

    if (record) {
      setFlashId(newSet.id)
      window.setTimeout(() => setFlashId((cur) => (cur === newSet.id ? null : cur)), 700)
    }
    setWeight('')
    setReps('')
  }

  async function removeSet(id: string) {
    await db.sets.delete(id)
  }

  return (
    <section className="block">
      <header className="block__head">
        <h2 className="block__title">{exercise.name}</h2>
        {historicalPR ? (
          <Badge variant="pr">
            PR {toDisplayWeight(historicalPR.bestEst1RM, unit)} {UNIT_LABEL[unit]}
          </Badge>
        ) : null}
      </header>

      {orderedSets.length > 0 ? (
        <ol className="set-list">
          <li className="set-list__head" aria-hidden>
            <span>Set</span>
            <span>Beban</span>
            <span>Reps</span>
            <span>1RM</span>
            <span />
          </li>
          {orderedSets.map((s, i) => {
            const isTopSet =
              historicalPR != null &&
              round1(estimateOneRepMax(s.weight, s.reps)) === round1(historicalPR.bestEst1RM)
            return (
              <li
                key={s.id}
                className={`set-row ${flashId === s.id ? 'forge' : ''}`}
              >
                <span className="set-row__idx num">{i + 1}</span>
                <span className="num">{toDisplayWeight(s.weight, unit)}</span>
                <span className="num">{s.reps}</span>
                <span className="num set-row__orm">
                  {toDisplayWeight(estimateOneRepMax(s.weight, s.reps), unit)}
                  {isTopSet ? <span className="set-row__crown" title="Rekor">▲</span> : null}
                </span>
                <button
                  className="set-row__del"
                  onClick={() => removeSet(s.id)}
                  aria-label={`Hapus set ${i + 1}`}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="block__empty">Belum ada set. Tambah set pertamamu.</p>
      )}

      <form className="set-add" onSubmit={addSet}>
        <div className="field set-add__field">
          <label className="field__label" htmlFor={`w-${exercise.id}`}>
            Beban ({UNIT_LABEL[unit]})
          </label>
          <input
            id={`w-${exercise.id}`}
            className="input input--num"
            type="number"
            inputMode="decimal"
            min="0"
            step={WEIGHT_STEP[unit]}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="field set-add__field">
          <label className="field__label" htmlFor={`r-${exercise.id}`}>
            Reps
          </label>
          <input
            id={`r-${exercise.id}`}
            className="input input--num"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="0"
          />
        </div>
        <Button type="submit" size="sm" disabled={!(Number(weight) > 0 && Number(reps) > 0)}>
          + Set
        </Button>
      </form>
    </section>
  )
}
