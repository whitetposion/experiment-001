import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { bootstrapApp } from '@/app/bootstrap'
import { AppProviders } from '@/app/providers'
import type { AppStore } from '@/app/store'
import { openConversation } from '@/features/conversations'
import type { MockChatApiOptions } from '@/services/mock-api/createMockChatApi'
import type { ConversationId } from '@/types/ids'
import { createTestStore } from './store'

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  store?: AppStore
}

export function renderWithProviders(
  ui: ReactElement,
  { store = createTestStore().store, ...options }: RenderWithProvidersOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <AppProviders store={store}>{children}</AppProviders>
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...options }) }
}

interface RenderLoadedOptions extends MockChatApiOptions {
  /** Opens this conversation before rendering. */
  conversationId?: ConversationId | null | undefined
}

/** Renders on a store that has finished loading, as the app is once it has started. */
export async function renderLoaded(
  ui: ReactElement,
  { conversationId, ...storeOptions }: RenderLoadedOptions = {},
) {
  const context = createTestStore(storeOptions)

  await context.store.dispatch(bootstrapApp())

  if (conversationId) {
    await context.store.dispatch(openConversation(conversationId))
  }

  const view = renderWithProviders(ui, { store: context.store })

  return { ...context, ...view, user: userEvent.setup() }
}
