export const THEME_PREFERENCES = ['system', 'light', 'dark', 'glass'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]
export type ResolvedTheme = Exclude<ThemePreference, 'system'>

/** index.html reads this key too, to apply the theme before the first paint. */
export const THEME_STORAGE_KEY = 'chat-theme'

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.some((preference) => preference === value)
}

/** Storage can throw when it is blocked, such as in private browsing. */
export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function writeThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // The theme still applies for this visit. It just will not be remembered.
  }
}

export function resolveTheme(preference: ThemePreference, systemIsDark: boolean): ResolvedTheme {
  if (preference !== 'system') {
    return preference
  }

  return systemIsDark ? 'dark' : 'light'
}
