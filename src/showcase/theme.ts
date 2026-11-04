export const THEMES = ['light', 'dark', 'glass'] as const

export type ShowcaseTheme = (typeof THEMES)[number]

export function isShowcaseTheme(value: string | null): value is ShowcaseTheme {
  return THEMES.some((theme) => theme === value)
}

export function applyTheme(theme: ShowcaseTheme) {
  document.documentElement.dataset['theme'] = theme
}
