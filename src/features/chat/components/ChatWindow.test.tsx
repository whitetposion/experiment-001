import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { bootstrapApp } from '@/app/bootstrap'
import { openConversation } from '@/features/conversations'
import { selectThreadMessageIds } from '@/features/messages'
import { selectComposerTarget } from '@/features/ui'
import { renderWithProviders } from '@/test/render'
import { createTestStore } from '@/test/store'
import { toConversationId, type ConversationId } from '@/types/ids'
import { ChatWindow } from './ChatWindow'

const rohan = toConversationId('conversation-rohan')
const kabir = toConversationId('conversation-kabir')
const launch = toConversationId('conversation-launch')
const priya = toConversationId('conversation-priya')

async function renderChat(conversationId: ConversationId | null, latency = 0) {
  const context = createTestStore({ latencyMs: { min: latency, max: latency } })
  await context.store.dispatch(bootstrapApp())

  if (conversationId) {
    await context.store.dispatch(openConversation(conversationId))
  }

  renderWithProviders(<ChatWindow />, { store: context.store })
  return { ...context, user: userEvent.setup() }
}

const input = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Message' })
const sendButton = () => screen.getByRole('button', { name: 'Send message' })
const header = () => screen.getByRole('banner')

// Scoped to the log, because a textarea's value also counts as its text content.
const findMessage = (text: string) => within(screen.getByRole('log')).findByText(text)

describe('ChatWindow', () => {
  it('prompts for a chat when none is selected', async () => {
    await renderChat(null)

    expect(screen.getByText('Select a chat to start messaging.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('uses the same window for direct and group conversations', async () => {
    const { store } = await renderChat(rohan)
    const parts = () => [
      screen.getByRole('banner'),
      screen.getByRole('log'),
      screen.getByRole('textbox', { name: 'Message' }),
    ]

    expect(parts()).toHaveLength(3)

    await store.dispatch(openConversation(launch))

    await screen.findByText('I will bring the test devices')
    expect(parts()).toHaveLength(3)
  })
})

describe('ChatHeader', () => {
  it('shows a person and their online status', async () => {
    await renderChat(rohan)

    expect(within(header()).getByRole('heading', { name: 'Rohan Desai' })).toBeInTheDocument()
    expect(header()).toHaveTextContent('Online')
  })

  it('shows when an offline person was last seen', async () => {
    await renderChat(kabir)

    expect(header()).toHaveTextContent(/Last seen/)
  })

  it('shows a group and its member count', async () => {
    await renderChat(launch)

    expect(within(header()).getByRole('heading', { name: 'Launch Crew' })).toBeInTheDocument()
    expect(header()).toHaveTextContent('5 members')
  })

  it('returns to the list from the back button', async () => {
    const { user } = await renderChat(rohan)

    await user.click(screen.getByRole('button', { name: 'Back to chats' }))

    expect(screen.getByText('Select a chat to start messaging.')).toBeInTheDocument()
  })
})

describe('MessageComposer', () => {
  it('sends with the button and clears the input', async () => {
    const { user } = await renderChat(rohan)

    await user.type(input(), 'Sign me up')
    await user.click(sendButton())

    expect(await findMessage('Sign me up')).toBeInTheDocument()
    await waitFor(() => {
      expect(input()).toHaveValue('')
    })
  })

  it('sends in a group through the same composer', async () => {
    const { user } = await renderChat(launch)

    await user.type(input(), 'See you at 10:30{Enter}')

    expect(await findMessage('See you at 10:30')).toBeInTheDocument()
  })

  it('sends with Enter and adds a line with Shift and Enter', async () => {
    const { user } = await renderChat(rohan)

    await user.type(input(), 'Line one{Shift>}{Enter}{/Shift}Line two')
    expect(input()).toHaveValue('Line one\nLine two')

    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(input()).toHaveValue('')
    })
  })

  it('does not send while an input method is composing', async () => {
    const { store, user } = await renderChat(rohan)
    const before = selectThreadMessageIds(store.getState(), rohan).length
    await user.type(input(), 'こんにちは')

    fireEvent.keyDown(input(), { key: 'Enter', isComposing: true })
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)))

    expect(input()).toHaveValue('こんにちは')
    expect(selectThreadMessageIds(store.getState(), rohan)).toHaveLength(before)
  })

  it('cannot send empty or blank text', async () => {
    const { store, user } = await renderChat(rohan)
    const before = selectThreadMessageIds(store.getState(), rohan).length

    expect(sendButton()).toBeDisabled()

    await user.type(input(), '   {Enter}')

    expect(sendButton()).toBeDisabled()
    expect(selectThreadMessageIds(store.getState(), rohan)).toHaveLength(before)
  })

  it('sends once when Enter is pressed twice', async () => {
    const { store, user } = await renderChat(rohan, 20)
    const before = selectThreadMessageIds(store.getState(), rohan).length

    await user.type(input(), 'Once{Enter}{Enter}')

    await findMessage('Once')
    expect(selectThreadMessageIds(store.getState(), rohan)).toHaveLength(before + 1)
  })

  it('keeps text typed while a message is on its way', async () => {
    const { user } = await renderChat(rohan, 40)

    await user.type(input(), 'First{Enter}')
    await user.type(input(), ' and more')

    await findMessage('First')
    expect(input()).toHaveValue('First and more')
  })

  it('keeps the draft and explains when sending fails', async () => {
    const { api, user } = await renderChat(rohan)
    await user.type(input(), 'Important')
    api.failNextRequest()

    await user.keyboard('{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection')
    expect(input()).toHaveValue('Important')

    await user.keyboard('{Enter}')

    expect(await findMessage('Important')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('starts empty in each conversation', async () => {
    const { store, user } = await renderChat(rohan)
    await user.type(input(), 'For Rohan')

    await store.dispatch(openConversation(priya))

    await waitFor(() => {
      expect(input()).toHaveValue('')
    })
  })
})

describe('replying', () => {
  async function startReply() {
    const context = await renderChat(rohan)
    const buttons = screen.getAllByRole('button', { name: 'Reply to Rohan Desai' })
    await context.user.click(buttons.at(-1) ?? document.body)
    return context
  }

  it('shows what is being replied to and moves focus to the input', async () => {
    await startReply()

    expect(screen.getByText('Replying to Rohan Desai')).toBeInTheDocument()
    expect(input()).toHaveFocus()
  })

  it('sends the reply and clears the banner', async () => {
    const { user } = await startReply()

    await user.keyboard('Yes please{Enter}')

    const sent = await findMessage('Yes please')
    expect(sent.closest('li')).toHaveTextContent('Want me to sign us both up?')
    expect(screen.queryByText('Replying to Rohan Desai')).not.toBeInTheDocument()
  })

  it('can be cancelled', async () => {
    const { store, user } = await startReply()

    await user.click(screen.getByRole('button', { name: 'Cancel reply' }))

    expect(selectComposerTarget(store.getState())).toBeNull()
    expect(screen.queryByText('Replying to Rohan Desai')).not.toBeInTheDocument()
  })

  it('keeps the reply target when sending fails', async () => {
    const { api, user } = await startReply()
    api.failNextRequest()

    await user.keyboard('Lost{Enter}')

    await screen.findByRole('alert')
    expect(screen.getByText('Replying to Rohan Desai')).toBeInTheDocument()
  })
})
