import type { SetEntry } from '../db/types'
import { estimateOneRepMax } from './oneRepMax'

export interface PersonalRecord {
  exerciseId: string
  /** Heaviest single weight lifted (any rep count). */
  bestWeight: number
  /** Highest estimated 1RM across all sets. */
  bestEst1RM: number
  /** Most reps performed in a single set. */
  bestReps: number
}

/**
 * Reduce a list of sets for one exercise to its personal records.
 * Returns null when there are no valid sets.
 */
export function computePR(exerciseId: string, sets: SetEntry[]): PersonalRecord | null {
  const valid = sets.filter((s) => s.weight > 0 && s.reps > 0)
  if (valid.length === 0) return null

  let bestWeight = 0
  let bestEst1RM = 0
  let bestReps = 0

  for (const s of valid) {
    if (s.weight > bestWeight) bestWeight = s.weight
    if (s.reps > bestReps) bestReps = s.reps
    const est = estimateOneRepMax(s.weight, s.reps)
    if (est > bestEst1RM) bestEst1RM = est
  }

  return { exerciseId, bestWeight, bestEst1RM, bestReps }
}

/** Group sets by exerciseId and compute a PR for each group. */
export function computeAllPRs(sets: SetEntry[]): PersonalRecord[] {
  const byExercise = new Map<string, SetEntry[]>()
  for (const s of sets) {
    const list = byExercise.get(s.exerciseId)
    if (list) list.push(s)
    else byExercise.set(s.exerciseId, [s])
  }

  const prs: PersonalRecord[] = []
  for (const [exerciseId, group] of byExercise) {
    const pr = computePR(exerciseId, group)
    if (pr) prs.push(pr)
  }
  return prs
}

/**
 * Does the candidate set beat every prior set on estimated 1RM?
 * Used to flag a freshly-logged set as a new record.
 */
export function isNewRecord(candidate: SetEntry, priorSets: SetEntry[]): boolean {
  if (candidate.weight <= 0 || candidate.reps <= 0) return false
  const candidateEst = estimateOneRepMax(candidate.weight, candidate.reps)
  const priorPR = computePR(candidate.exerciseId, priorSets)
  if (!priorPR) return true
  return candidateEst > priorPR.bestEst1RM
}
