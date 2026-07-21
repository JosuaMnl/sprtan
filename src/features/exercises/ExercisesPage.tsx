import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, makeId } from '../../db/database'
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  type Exercise,
  type MuscleGroup,
} from '../../db/types'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, EmptyState } from '../../components/ui/primitives'
import './exercises.css'

export function ExercisesPage() {
  const exercises = useLiveQuery(() => db.exercises.toArray(), [], [])
  const [name, setName] = useState('')
  const [group, setGroup] = useState<MuscleGroup>('chest')
  const [error, setError] = useState('')

  const grouped = useMemo(() => {
    const map = new Map<MuscleGroup, Exercise[]>()
    for (const g of MUSCLE_GROUPS) map.set(g, [])
    for (const ex of exercises) map.get(ex.muscleGroup)?.push(ex)
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name))
    return map
  }, [exercises])

  async function addExercise(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Nama gerakan wajib diisi.')
      return
    }
    const exists = exercises.some(
      (ex) => ex.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) {
      setError('Gerakan itu sudah ada.')
      return
    }
    await db.exercises.add({
      id: makeId(),
      name: trimmed,
      muscleGroup: group,
      isCustom: true,
      createdAt: Date.now(),
    })
    setName('')
    setError('')
  }

  async function removeExercise(ex: Exercise) {
    const setCount = await db.sets.where('exerciseId').equals(ex.id).count()
    const msg =
      setCount > 0
        ? `Hapus "${ex.name}"? ${setCount} set tercatat akan ikut terhapus.`
        : `Hapus "${ex.name}"?`
    if (!confirm(msg)) return
    await db.transaction('rw', db.exercises, db.sets, async () => {
      await db.sets.where('exerciseId').equals(ex.id).delete()
      await db.exercises.delete(ex.id)
    })
  }

  return (
    <div>
      <PageHeader eyebrow="ARSENAL" title="Gerakan" />

      <Card className="exercise-form-card">
        <form className="exercise-form" onSubmit={addExercise}>
          <div className="field exercise-form__name">
            <label className="field__label" htmlFor="ex-name">
              Gerakan baru
            </label>
            <input
              id="ex-name"
              className="input"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder="mis. Bulgarian Split Squat"
              maxLength={60}
            />
          </div>
          <div className="field exercise-form__group">
            <label className="field__label" htmlFor="ex-group">
              Otot
            </label>
            <select
              id="ex-group"
              className="select"
              value={group}
              onChange={(e) => setGroup(e.target.value as MuscleGroup)}
            >
              {MUSCLE_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {MUSCLE_GROUP_LABELS[g]}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Tambah</Button>
        </form>
        {error ? <p className="exercise-form__error">{error}</p> : null}
      </Card>

      {exercises.length === 0 ? (
        <EmptyState title="Belum ada gerakan.">
          <p>Perpustakaan sedang dimuat…</p>
        </EmptyState>
      ) : (
        <div className="muscle-groups">
          {MUSCLE_GROUPS.map((g) => {
            const list = grouped.get(g) ?? []
            if (list.length === 0) return null
            return (
              <section key={g} className="muscle-group">
                <h2 className="muscle-group__title">
                  {MUSCLE_GROUP_LABELS[g]}
                  <span className="muscle-group__count num">{list.length}</span>
                </h2>
                <ul className="exercise-list">
                  {list.map((ex) => (
                    <li key={ex.id} className="exercise-row">
                      <span className="exercise-row__name">{ex.name}</span>
                      {ex.isCustom ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeExercise(ex)}
                          aria-label={`Hapus ${ex.name}`}
                        >
                          Hapus
                        </Button>
                      ) : (
                        <span className="exercise-row__stock">baku</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
