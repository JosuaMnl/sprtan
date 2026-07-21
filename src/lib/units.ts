import { round1 } from './oneRepMax'

export type WeightUnit = 'kg' | 'lbs'

export const LBS_PER_KG = 2.20462262185

export const UNIT_LABEL: Record<WeightUnit, string> = {
  kg: 'kg',
  lbs: 'lbs',
}

/** Input step per unit (plate-friendly). */
export const WEIGHT_STEP: Record<WeightUnit, number> = {
  kg: 0.5,
  lbs: 1,
}

export function kgToLbs(kg: number): number {
  return kg * LBS_PER_KG
}

export function lbsToKg(lbs: number): number {
  return lbs / LBS_PER_KG
}

/**
 * Convert a canonical kg value into the display unit, rounded for UI.
 * Works for any mass-derived quantity (weight, volume) since reps are unitless.
 */
export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  return unit === 'lbs' ? round1(kgToLbs(kg)) : round1(kg)
}

/** Convert a value the user typed (in their unit) into canonical kg for storage. */
export function fromInputWeight(value: number, unit: WeightUnit): number {
  return unit === 'lbs' ? lbsToKg(value) : value
}
