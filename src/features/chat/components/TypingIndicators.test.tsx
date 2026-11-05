import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConversationSidebar } from '@/features/conversations'
import { typingStarted, typingStopped } from '@/features/presence'
import { renderLoaded } from '@/test/render'
import { TEST_NOW } from '@/test/store'
import { toConversationId, toUserId, type ConversationId } from '@/types/ids'
import { ChatWindow } from './ChatWindow'

const rohan = toConversationId('conversation-rohan')
const launch = toConversationId('conversation-launch')

const indicator = (conversationId: ConversationId, user: string) => ({
  conversationId,
  userId: toUserId(user),
  startedAt: TEST_NOW.toISOString(),
  expiresAt: TEST_NOW.toISOString(),
})

async function renderChat(conversationId: ConversationId) {
  const { store } = await renderLoaded(
    <>
      <ConversationSidebar />
      <ChatWindow />
    </>,
    { conversationId },
  )
  return store
}

// The sidebar has a header too, so this finds the chat's from its heading.
function chatHeader() {
  const header = screen.getByRole('heading', { level: 2 }).closest('header')

  if (!header) {
    throw new Error('Expected the chat header')
  }

  return header
}

describe('typing indicators', () => {
  it('replaces the status under the name, then restores it', async () => {
    const store = await renderChat(rohan)
    const header = chatHeader()
    expect(header).toHaveTextContent('Online')

    act(() => {
      store.dispatch(typingStarted(indicator(rohan, 'user-rohan')))
    })
    expect(header).toHaveTextContent('typing…')
    expect(header).not.toHaveTextContent('Online')

    act(() => {
      store.dispatch(typingStopped({ conversationId: rohan, userId: toUserId('user-rohan') }))
    })
    expect(header).toHaveTextContent('Online')
  })

  it('names the person in a group header', async () => {
    const store = await renderChat(launch)

    act(() => {
      store.dispatch(typingStarted(indicator(launch, 'user-priya')))
    })

    expect(chatHeader()).toHaveTextContent('Priya is typing…')
  })

  it('replaces the sidebar preview, keeping the unread count', async () => {
    const store = await renderChat(rohan)
    const row = screen.getByRole('button', { name: /Launch Crew/ })

    act(() => {
      store.dispatch(typingStarted(indicator(launch, 'user-dev')))
    })

    expect(row).toHaveTextContent('Dev is typing…')
    expect(row).not.toHaveTextContent('I will bring the test devices')
    expect(row).toHaveAccessibleName(/3 unread messages/)
  })
})
