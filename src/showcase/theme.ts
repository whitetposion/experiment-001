import { THEME_PREFERENCES, type ResolvedTheme } from '@/theme/preference'

export const THEMES = THEME_PREFERENCES.filter(
  (preference): preference is ResolvedTheme => preference !== 'system',
)

export type ShowcaseTheme = ResolvedTheme

export function isShowcaseTheme(value: string | null): value is ShowcaseTheme {
  return THEMES.some((theme) => theme === value)
}

export function applyTheme(theme: ShowcaseTheme) {
  document.documentElement.dataset['theme'] = theme
}
