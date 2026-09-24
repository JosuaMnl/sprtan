import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type Theme = 'light' | 'dark'

/** Must match the key read by the pre-paint script in index.html. */
const STORAGE_KEY = 'sprtan.theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Browser-chrome colours matching --color-paper for each theme. */
const THEME_COLOR: Record<Theme, string> = { light: '#f6f5f3', dark: '#0d1017' }

interface ThemeContextValue {
  preference: ThemePreference
  theme: Theme
  setPreference: (p: ThemePreference) => void
  /** Flip to the opposite of what is on screen now (explicit choice). */
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function systemTheme(): Theme {
  return typeof window !== 'undefined' && window.matchMedia?.(DARK_QUERY).matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored)
  const [system, setSystem] = useState<Theme>(systemTheme)

  // Follow OS changes while the preference is "system".
  useEffect(() => {
    const mq = window.matchMedia?.(DARK_QUERY)
    if (!mq) return
    const onChange = () => setSystem(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const theme: Theme = preference === 'system' ? system : preference

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  }, [theme])

  useEffect(() => {
    try {
      if (preference === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      // storage unavailable (private mode) — keep in-memory only
    }
  }, [preference])

  const setPreference = useCallback((p: ThemePreference) => setPreferenceState(p), [])
  const toggle = useCallback(
    () => setPreferenceState(theme === 'dark' ? 'light' : 'dark'),
    [theme],
  )

  const value = useMemo(
    () => ({ preference, theme, setPreference, toggle }),
    [preference, theme, setPreference, toggle],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
