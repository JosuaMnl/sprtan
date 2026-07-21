/**
 * Estimated one-rep max using the Epley formula.
 *   1RM = weight * (1 + reps / 30)
 * For a single rep this returns the weight itself.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

/** Total load moved by a set: weight × reps. */
export function setVolume(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return weight * reps
}

/** Round to one decimal for display without floating-point noise. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10
}
