import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { bootstrapApp } from '@/app/bootstrap'
import { selectUnreadCount } from '@/features/conversations/state/selectors'
import { messageReceived } from '@/features/messages'
import { fetchDirectory } from '@/features/presence'
import { renderWithProviders } from '@/test/render'
import { TEST_NOW, createTestStore } from '@/test/store'
import { toConversationId, toMessageId, toUserId } from '@/types/ids'
import { fetchConversations } from '@/features/conversations/state/thunks'
import { ConversationSidebar } from './ConversationSidebar'

async function renderSidebar() {
  const context = createTestStore()
  await context.store.dispatch(bootstrapApp())
  renderWithProviders(<ConversationSidebar />, { store: context.store })
  return { ...context, user: userEvent.setup() }
}

const rows = () => within(screen.getByRole('list')).getAllByRole('button')
const row = (name: RegExp) => screen.getByRole('button', { name })

describe('profile', () => {
  it('explains a failed directory load, and recovers on retry', async () => {
    const { api, store } = createTestStore()
    api.failNextRequest()
    await store.dispatch(fetchDirectory())
    renderWithProviders(<ConversationSidebar />, { store })

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load people')
    expect(screen.queryByLabelText('Loading your profile')).not.toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Maya Iyer')).toBeInTheDocument()
    expect(screen.queryByText('Could not load people')).not.toBeInTheDocument()
  })
})

describe('list', () => {
  it('shows direct and group conversations in one list, newest first', async () => {
    await renderSidebar()

    expect(rows()).toHaveLength(9)
    expect(rows()[0]).toHaveTextContent('Launch Crew')
    expect(rows()[1]).toHaveTextContent('Rohan Desai')
  })

  it('shows the current user', async () => {
    await renderSidebar()

    expect(screen.getByText('Maya Iyer')).toBeInTheDocument()
  })

  it('names the sender in group previews only', async () => {
    await renderSidebar()

    expect(row(/Launch Crew/)).toHaveTextContent('Dev: I will bring the test devices')
    expect(row(/Rohan Desai/)).toHaveTextContent('Want me to sign us both up?')
    expect(row(/Rohan Desai/)).not.toHaveTextContent('Rohan: Want')
  })

  it('shows initials for people and an icon for groups', async () => {
    await renderSidebar()

    expect(within(row(/Rohan Desai/)).getByText('RD')).toBeInTheDocument()
    expect(row(/Launch Crew/).querySelector('.lucide-users')).toBeInTheDocument()
  })

  it('shows online status for direct conversations only', async () => {
    await renderSidebar()

    expect(row(/Rohan Desai/)).toHaveAccessibleName(/Online/)
    expect(row(/Kabir Shah/)).not.toHaveAccessibleName(/Online/)
    expect(row(/Launch Crew/)).not.toHaveAccessibleName(/Online/)
  })

  it('reads each row as a sentence', async () => {
    await renderSidebar()

    expect(row(/Launch Crew/)).toHaveAccessibleName(
      expect.stringMatching(
        /^Launch Crew,\s*[^,]+,\s*Dev: I will bring the test devices,\s*3 unread messages$/,
      ),
    )
    expect(row(/Rohan Desai/)).toHaveAccessibleName(expect.stringMatching(/^Rohan Desai, Online,/))
    expect(row(/Priya Nair/)).not.toHaveAccessibleName(/unread/)
    expect(row(/Vikram Joshi/)).toHaveAccessibleName(/No messages yet/)
  })

  it('shows a machine-readable time for each message', async () => {
    await renderSidebar()

    expect(row(/Rohan Desai/).querySelector('time')).toHaveAttribute('datetime')
  })

  it('shows delivery status on the current user’s messages', async () => {
    await renderSidebar()

    expect(row(/Priya Nair/)).toHaveAccessibleName(/Read/)
    expect(row(/Ananya Rao/)).toHaveAccessibleName(/Delivered/)
    expect(row(/Dev Malhotra/)).toHaveAccessibleName(/Failed to send/)
  })

  it('handles deleted and empty conversations', async () => {
    await renderSidebar()

    expect(row(/Kabir Shah/)).toHaveTextContent('You deleted this message')
    expect(row(/Vikram Joshi/)).toHaveTextContent('No messages yet')
    expect(row(/Vikram Joshi/).querySelector('time')).toBeNull()
  })

  it('updates when a message arrives', async () => {
    const { store } = await renderSidebar()

    store.dispatch(
      messageReceived({
        id: toMessageId('message-new'),
        conversationId: toConversationId('conversation-priya'),
        senderId: toUserId('user-priya'),
        createdAt: TEST_NOW.toISOString(),
        replyToMessageId: null,
        deliveryStatus: 'delivered',
        state: 'active',
        text: 'Fresh message',
        editedAt: null,
        reactions: [],
        attachments: [],
      }),
    )

    await waitFor(() => {
      expect(rows()[0]).toHaveTextContent('Fresh message')
    })
    expect(rows()[0]).toHaveAccessibleName(/1 unread message$/)
  })
})

describe('filters', () => {
  it('starts on All', async () => {
    await renderSidebar()

    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('narrows to unread chats and shows the total', async () => {
    const { user } = await renderSidebar()

    await user.click(screen.getByRole('button', { name: 'Unread 6' }))

    expect(rows()).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Unread 6' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('narrows to groups', async () => {
    const { user } = await renderSidebar()

    await user.click(screen.getByRole('button', { name: 'Groups' }))

    expect(rows().map((item) => item.textContent)).toEqual([
      expect.stringContaining('Launch Crew'),
      expect.stringContaining('Weekend Trek'),
      expect.stringContaining('Flat 4B'),
    ])
  })

  it('offers a way out when a filter has no results', async () => {
    const { user } = await renderSidebar()
    await user.click(screen.getByRole('button', { name: 'Unread 6' }))

    for (const name of [/Launch Crew/, /Rohan Desai/, /Weekend Trek/]) {
      await user.click(row(name))
    }

    await waitFor(() => {
      expect(screen.getByText('No unread chats')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Show all chats' }))

    expect(rows()).toHaveLength(9)
  })
})

describe('search', () => {
  it('narrows the list as the user types', async () => {
    const { user } = await renderSidebar()

    await user.type(screen.getByRole('searchbox', { name: 'Search chats and messages' }), 'trek')

    await waitFor(() => {
      expect(rows()).toHaveLength(1)
    })
    expect(rows()[0]).toHaveTextContent('Weekend Trek')
  })

  it('works together with a filter', async () => {
    const { user } = await renderSidebar()

    await user.click(screen.getByRole('button', { name: 'Groups' }))
    await user.type(screen.getByRole('searchbox'), 'rohan')

    expect(await screen.findByText('No chats match "rohan"')).toBeInTheDocument()
  })

  it('clears from the button and keeps focus in the search box', async () => {
    const { user } = await renderSidebar()
    await user.type(screen.getByRole('searchbox'), 'trek')
    await waitFor(() => {
      expect(rows()).toHaveLength(1)
    })

    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.getByRole('searchbox')).toHaveFocus()
    expect(rows()).toHaveLength(9)
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
  })

  it('clears from the empty state', async () => {
    const { user } = await renderSidebar()
    await user.type(screen.getByRole('searchbox'), 'nobody')
    await screen.findByText('No chats match "nobody"')

    const [, emptyStateButton] = screen.getAllByRole('button', { name: 'Clear search' })

    await user.click(emptyStateButton ?? document.body)

    expect(rows()).toHaveLength(9)
  })
})

describe('selecting', () => {
  it('marks the open chat and clears its unread count', async () => {
    const { store, user } = await renderSidebar()
    const conversationId = toConversationId('conversation-rohan')

    await user.click(row(/Rohan Desai/))

    expect(row(/Rohan Desai/)).toHaveAttribute('aria-current', 'true')
    await waitFor(() => {
      expect(selectUnreadCount(store.getState(), conversationId)).toBe(0)
    })
    expect(row(/Rohan Desai/)).not.toHaveAccessibleName(/unread/)
  })

  it('moves the marker when another chat is opened', async () => {
    const { user } = await renderSidebar()

    await user.click(row(/Rohan Desai/))
    await user.click(row(/Priya Nair/))

    expect(row(/Rohan Desai/)).not.toHaveAttribute('aria-current')
    expect(row(/Priya Nair/)).toHaveAttribute('aria-current', 'true')
  })

  it('opens a chat from the keyboard', async () => {
    const { user } = await renderSidebar()

    row(/Rohan Desai/).focus()
    await user.keyboard('{Enter}')

    expect(row(/Rohan Desai/)).toHaveAttribute('aria-current', 'true')
  })
})

describe('loading and errors', () => {
  it('shows a labelled skeleton before data arrives', () => {
    renderWithProviders(<ConversationSidebar />)

    expect(screen.getByRole('status', { name: 'Loading chats' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
    expect(screen.getByRole('status', { name: 'Loading your profile' })).toBeInTheDocument()
  })

  it('shows the error and recovers on retry', async () => {
    const { api, store } = createTestStore()
    await store.dispatch(fetchDirectory())
    api.failNextRequest()
    await store.dispatch(fetchConversations())
    renderWithProviders(<ConversationSidebar />, { store })
    const user = userEvent.setup()

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your chats')
    expect(screen.getByRole('alert')).toHaveTextContent('Check your connection')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('button', { name: /Launch Crew/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
