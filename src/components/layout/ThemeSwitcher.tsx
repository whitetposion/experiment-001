import { Palette } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { IconButton } from '@/components/ui/IconButton'
import { isThemePreference, THEME_PREFERENCES, type ThemePreference } from '@/theme/preference'
import { useTheme } from '@/theme/themeContext'

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
  glass: 'Glass',
}

export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label="Change theme" variant="ghost">
          <Palette aria-hidden="true" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          onValueChange={(value) => {
            if (isThemePreference(value)) {
              setPreference(value)
            }
          }}
          value={preference}
        >
          {THEME_PREFERENCES.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {THEME_LABELS[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
