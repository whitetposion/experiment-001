import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { AppProviders } from '@/app/providers'
import { makeStore, type AppStore } from '@/app/store'

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  store?: AppStore
}

export function renderWithProviders(
  ui: ReactElement,
  { store = makeStore(), ...options }: RenderWithProvidersOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <AppProviders store={store}>{children}</AppProviders>
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...options }) }
}
