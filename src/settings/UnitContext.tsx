import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { WeightUnit } from '../lib/units'

const STORAGE_KEY = 'sprtan.unit'

interface UnitContextValue {
  unit: WeightUnit
  setUnit: (u: WeightUnit) => void
}

const UnitContext = createContext<UnitContextValue | null>(null)

function readStored(): WeightUnit {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'lbs' ? 'lbs' : 'kg'
  } catch {
    return 'kg'
  }
}

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<WeightUnit>(readStored)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, unit)
    } catch {
      // storage unavailable (private mode) — keep in-memory only
    }
  }, [unit])

  const setUnit = useCallback((u: WeightUnit) => setUnitState(u), [])

  const value = useMemo(() => ({ unit, setUnit }), [unit, setUnit])
  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>
}

export function useUnit(): UnitContextValue {
  const ctx = useContext(UnitContext)
  if (!ctx) throw new Error('useUnit must be used within a UnitProvider')
  return ctx
}
