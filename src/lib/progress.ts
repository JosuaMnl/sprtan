import type { SetEntry, Workout } from '../db/types'
import { estimateOneRepMax, round1, setVolume } from './oneRepMax'

export type ProgressMetric = 'maxWeight' | 'volume' | 'est1RM'

export interface ProgressPoint {
  date: string
  value: number
}

export const METRIC_LABELS: Record<ProgressMetric, string> = {
  maxWeight: 'Beban Maks',
  volume: 'Volume',
  est1RM: 'Est. 1RM',
}

/**
 * Build a time series for one exercise. Sets are grouped by their workout's
 * date; each date reduces to a single value per the chosen metric.
 */
export function buildProgressSeries(
  sets: SetEntry[],
  workouts: Workout[],
  metric: ProgressMetric,
): ProgressPoint[] {
  const dateByWorkout = new Map(workouts.map((w) => [w.id, w.date]))
  const byDate = new Map<string, SetEntry[]>()

  for (const s of sets) {
    if (s.weight <= 0 || s.reps <= 0) continue
    const date = dateByWorkout.get(s.workoutId)
    if (!date) continue
    const list = byDate.get(date)
    if (list) list.push(s)
    else byDate.set(date, [s])
  }

  const points: ProgressPoint[] = []
  for (const [date, daySets] of byDate) {
    points.push({ date, value: reduceMetric(daySets, metric) })
  }

  points.sort((a, b) => a.date.localeCompare(b.date))
  return points
}

function reduceMetric(sets: SetEntry[], metric: ProgressMetric): number {
  if (metric === 'volume') {
    const total = sets.reduce((sum, s) => sum + setVolume(s.weight, s.reps), 0)
    return round1(total)
  }
  if (metric === 'est1RM') {
    const best = sets.reduce(
      (max, s) => Math.max(max, estimateOneRepMax(s.weight, s.reps)),
      0,
    )
    return round1(best)
  }
  // maxWeight
  const best = sets.reduce((max, s) => Math.max(max, s.weight), 0)
  return round1(best)
}
