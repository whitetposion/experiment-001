import { createContext, useContext } from 'react'
import type { ResolvedTheme, ThemePreference } from './preference'

export interface ThemeContextValue {
  /** What the user chose, which may be to follow the system. */
  preference: ThemePreference
  /** The theme actually on screen. */
  theme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const value = useContext(ThemeContext)

  if (!value) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }

  return value
}
