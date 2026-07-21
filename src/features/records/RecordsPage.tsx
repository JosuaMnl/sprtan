import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/database'
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  type Exercise,
  type MuscleGroup,
  type SetEntry,
} from '../../db/types'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge, Button, Card, EmptyState } from '../../components/ui/primitives'
import { computeAllPRs } from '../../lib/prCalculator'
import { useUnit } from '../../settings/UnitContext'
import { UNIT_LABEL, toDisplayWeight } from '../../lib/units'
import './records.css'

export function RecordsPage() {
  const { unit } = useUnit()
  const exercises = useLiveQuery(() => db.exercises.toArray(), [], []) as Exercise[]
  const sets = useLiveQuery(() => db.sets.toArray(), [], []) as SetEntry[]

  const exById = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises],
  )

  const prsByGroup = useMemo(() => {
    const prs = computeAllPRs(sets.filter((s) => s.weight > 0 && s.reps > 0))
    const map = new Map<MuscleGroup, { name: string; pr: (typeof prs)[number] }[]>()
    for (const g of MUSCLE_GROUPS) map.set(g, [])
    for (const pr of prs) {
      const ex = exById.get(pr.exerciseId)
      if (!ex) continue
      map.get(ex.muscleGroup)?.push({ name: ex.name, pr })
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.pr.bestEst1RM - a.pr.bestEst1RM)
    }
    return map
  }, [sets, exById])

  const total = useMemo(
    () => [...prsByGroup.values()].reduce((n, list) => n + list.length, 0),
    [prsByGroup],
  )

  return (
    <div>
      <PageHeader eyebrow="ΤΑΝ Ἢ ΕΠΙ ΤΑΣ" title="Rekor" />

      {total === 0 ? (
        <EmptyState title="Belum ada rekor.">
          <p>Rekor pribadi lahir dari besi yang terangkat. Catat latihan pertamamu.</p>
          <Link to="/log">
            <Button>Catat Latihan</Button>
          </Link>
        </EmptyState>
      ) : (
        <div className="records">
          {MUSCLE_GROUPS.map((g) => {
            const list = prsByGroup.get(g) ?? []
            if (list.length === 0) return null
            return (
              <section key={g} className="records__group">
                <h2 className="records__title">{MUSCLE_GROUP_LABELS[g]}</h2>
                <div className="records__grid">
                  {list.map(({ name, pr }) => (
                    <Card key={pr.exerciseId} className="pr-card" hover>
                      <div className="pr-card__head">
                        <h3 className="pr-card__name">{name}</h3>
                        <Badge variant="laurel">
                          1RM {toDisplayWeight(pr.bestEst1RM, unit)} {UNIT_LABEL[unit]}
                        </Badge>
                      </div>
                      <div className="pr-card__stats">
                        <div className="pr-stat">
                          <span className="pr-stat__label">Beban Maks</span>
                          <span className="pr-stat__val num">
                            {toDisplayWeight(pr.bestWeight, unit)}
                            <span className="pr-stat__unit">{UNIT_LABEL[unit]}</span>
                          </span>
                        </div>
                        <div className="pr-stat">
                          <span className="pr-stat__label">Reps Maks</span>
                          <span className="pr-stat__val num">{pr.bestReps}</span>
                        </div>
                        <div className="pr-stat">
                          <span className="pr-stat__label">Est. 1RM</span>
                          <span className="pr-stat__val pr-stat__val--accent num">
                            {toDisplayWeight(pr.bestEst1RM, unit)}
                            <span className="pr-stat__unit">{UNIT_LABEL[unit]}</span>
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
