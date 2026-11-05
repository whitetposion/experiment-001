import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  isThemePreference,
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  writeThemePreference,
  type ThemePreference,
} from './preference'
import { ThemeContext } from './themeContext'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribeToSystemTheme(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') {
    return () => undefined
  }

  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', onChange)

  return () => {
    query.removeEventListener('change', onChange)
  }
}

function getSystemIsDark() {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(readThemePreference)
  const systemIsDark = useSyncExternalStore(subscribeToSystemTheme, getSystemIsDark)
  const theme = resolveTheme(preference, systemIsDark)

  // Before paint, so a change never shows a frame of the old theme.
  useLayoutEffect(() => {
    document.documentElement.dataset['theme'] = theme
  }, [theme])

  // Keeps other open tabs in step. The storage event only fires in the tabs that did not write.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === THEME_STORAGE_KEY) {
        setPreferenceState(isThemePreference(event.newValue) ? event.newValue : 'system')
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const setPreference = useCallback((next: ThemePreference) => {
    writeThemePreference(next)
    setPreferenceState(next)
  }, [])

  const value = useMemo(
    () => ({ preference, setPreference, theme }),
    [preference, setPreference, theme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
