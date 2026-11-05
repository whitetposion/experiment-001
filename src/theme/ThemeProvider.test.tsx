import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher'
import { TooltipProvider } from '@/components/ui/Tooltip'
import indexHtml from '/index.html?raw'
import {
  readThemePreference,
  resolveTheme,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
} from './preference'
import { useTheme } from './themeContext'
import { ThemeProvider } from './ThemeProvider'

type ChangeListener = () => void

function mockSystem(isDark: boolean) {
  const listeners = new Set<ChangeListener>()
  const query = {
    matches: isDark,
    addEventListener: (_type: string, listener: ChangeListener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: ChangeListener) => {
      listeners.delete(listener)
    },
  }

  window.matchMedia = vi.fn().mockReturnValue(query)

  return {
    listeners,
    setDark(next: boolean) {
      query.matches = next
      for (const listener of listeners) {
        listener()
      }
    },
  }
}

function Reader() {
  const { preference, theme } = useTheme()
  return <p>{`${preference} is ${theme}`}</p>
}

function renderSwitcher() {
  const view = render(
    <ThemeProvider>
      <TooltipProvider>
        <ThemeSwitcher />
        <Reader />
      </TooltipProvider>
    </ThemeProvider>,
  )
  return { ...view, user: userEvent.setup() }
}

const appliedTheme = () => document.documentElement.dataset['theme']

async function choose(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: 'Change theme' }))
  await user.click(await screen.findByRole('menuitemradio', { name }))
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset['theme']
})

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia')
  vi.restoreAllMocks()
})

describe('resolveTheme', () => {
  it('uses an explicit choice whatever the system says', () => {
    expect(resolveTheme('glass', false)).toBe('glass')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('follows the system otherwise', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})

describe('reading the saved preference', () => {
  it('falls back to system for a missing or unknown value', () => {
    expect(readThemePreference()).toBe('system')

    localStorage.setItem(THEME_STORAGE_KEY, 'neon')

    expect(readThemePreference()).toBe('system')
  })

  it('falls back to system when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked')
    })

    expect(readThemePreference()).toBe('system')
  })
})

describe('ThemeProvider', () => {
  it('follows the system by default', () => {
    mockSystem(true)
    renderSwitcher()

    expect(appliedTheme()).toBe('dark')
    expect(screen.getByText('system is dark')).toBeInTheDocument()
  })

  it('uses light without matchMedia', () => {
    renderSwitcher()

    expect(appliedTheme()).toBe('light')
  })

  it('applies a saved theme on start', () => {
    mockSystem(false)
    localStorage.setItem(THEME_STORAGE_KEY, 'glass')

    renderSwitcher()

    expect(appliedTheme()).toBe('glass')
  })

  it('follows a live system change while on system', () => {
    const system = mockSystem(false)
    renderSwitcher()

    act(() => {
      system.setDark(true)
    })

    expect(appliedTheme()).toBe('dark')
  })

  it('ignores a system change when a theme was chosen', async () => {
    const system = mockSystem(false)
    const { user } = renderSwitcher()
    await choose(user, 'Light')

    act(() => {
      system.setDark(true)
    })

    expect(appliedTheme()).toBe('light')
  })

  it('follows a change made in another tab', () => {
    mockSystem(false)
    renderSwitcher()

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'glass' }),
      )
    })

    expect(appliedTheme()).toBe('glass')
  })

  it('ignores storage changes for other keys', () => {
    mockSystem(false)
    renderSwitcher()

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: 'glass' }))
    })

    expect(appliedTheme()).toBe('light')
  })

  it('removes its listeners on unmount', () => {
    const system = mockSystem(false)
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderSwitcher()
    expect(system.listeners.size).toBeGreaterThan(0)

    unmount()

    expect(system.listeners.size).toBe(0)
    expect(remove).toHaveBeenCalledWith('storage', expect.any(Function))
  })

  it('needs a provider around useTheme', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => render(<Reader />)).toThrow('useTheme must be used inside ThemeProvider')
  })
})

describe('ThemeSwitcher', () => {
  it('offers every theme and marks the current one', async () => {
    mockSystem(false)
    const { user } = renderSwitcher()

    await user.click(screen.getByRole('button', { name: 'Change theme' }))

    const options = await screen.findAllByRole('menuitemradio')
    expect(options.map((option) => option.textContent)).toEqual([
      'System',
      'Light',
      'Dark',
      'Glass',
    ])
    expect(screen.getByRole('menuitemradio', { name: 'System' })).toBeChecked()
  })

  it.each([
    ['Light', 'light'],
    ['Dark', 'dark'],
    ['Glass', 'glass'],
  ])('switches to %s and remembers it', async (name, theme) => {
    mockSystem(false)
    const { user } = renderSwitcher()

    await choose(user, name)

    expect(appliedTheme()).toBe(theme)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(theme)
  })

  it('returns to following the system', async () => {
    mockSystem(true)
    const { user } = renderSwitcher()
    await choose(user, 'Light')

    await choose(user, 'System')

    expect(appliedTheme()).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
  })

  it('still switches when storage is blocked', async () => {
    mockSystem(false)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked')
    })
    const { user } = renderSwitcher()

    await choose(user, 'Glass')

    expect(appliedTheme()).toBe('glass')
  })

  it('works from the keyboard and returns focus', async () => {
    mockSystem(false)
    const { user } = renderSwitcher()
    const trigger = screen.getByRole('button', { name: 'Change theme' })
    trigger.focus()

    await user.keyboard('{Enter}')
    await screen.findByRole('menu')
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(appliedTheme()).toBe('dark')
    await waitFor(() => {
      expect(trigger).toHaveFocus()
    })
  })
})

describe('the script in index.html', () => {
  it('uses the same storage key and themes as the app', () => {
    expect(indexHtml).toContain(`localStorage.getItem('${THEME_STORAGE_KEY}')`)

    for (const preference of THEME_PREFERENCES.filter((item) => item !== 'system')) {
      expect(indexHtml).toContain(`'${preference}'`)
    }
  })
})
