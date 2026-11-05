import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bootstrapApp } from '@/app/bootstrap'
import { openConversation } from '@/features/conversations'
import {
  editMessage,
  deleteMessage,
  fetchMessages,
  messageReceived,
  messageStatusChanged,
  sendMessage,
} from '@/features/messages'
import { renderWithProviders } from '@/test/render'
import { incomingMessage } from '@/test/fixtures'
import { createTestStore } from '@/test/store'
import { toConversationId, toMessageId, type ConversationId } from '@/types/ids'
import { MessageList } from './MessageList'

// Every bubble renders one timestamp, so counting these counts bubble renders.
const timestampRenders = vi.hoisted(() => ({ count: 0 }))

vi.mock('./MessageTimestamp', async (importOriginal) => {
  const original = await importOriginal<typeof import('./MessageTimestamp')>()

  return {
    MessageTimestamp(props: ComponentProps<typeof original.MessageTimestamp>) {
      timestampRenders.count += 1
      return original.MessageTimestamp(props)
    },
  }
})

const rohan = toConversationId('conversation-rohan')
const launch = toConversationId('conversation-launch')
const trek = toConversationId('conversation-trek')
const priya = toConversationId('conversation-priya')
const ananya = toConversationId('conversation-ananya')
const dev = toConversationId('conversation-dev')
const empty = toConversationId('conversation-vikram')

const incoming = (conversationId: ConversationId, id: string) =>
  incomingMessage(conversationId, id, { text: `Text of ${id}` })

async function renderThread(conversationId: ConversationId, showSender = false) {
  const context = createTestStore()
  await context.store.dispatch(bootstrapApp())
  await context.store.dispatch(openConversation(conversationId))
  const onReply = vi.fn()
  const onEdit = vi.fn()
  renderWithProviders(
    <MessageList
      conversationId={conversationId}
      onEdit={onEdit}
      onReply={onReply}
      showSender={showSender}
    />,
    { store: context.store },
  )
  return { ...context, onEdit, onReply, user: userEvent.setup() }
}

const bubble = (text: string) => screen.getByText(text).closest('li') as HTMLElement

beforeEach(() => {
  timestampRenders.count = 0
})

describe('messages', () => {
  it('renders the thread in order', async () => {
    await renderThread(rohan)
    const items = within(screen.getByRole('log')).getAllByRole('listitem')

    expect(items).toHaveLength(6)
    expect(items[0]).toHaveTextContent('Are you doing the 10k on Sunday?')
    expect(items[5]).toHaveTextContent('Want me to sign us both up?')
  })

  it('says who sent each message to screen readers', async () => {
    await renderThread(rohan)

    expect(bubble('Deal. 5k it is')).toHaveTextContent('You:')
    expect(bubble('Want me to sign us both up?')).toHaveTextContent('Rohan Desai:')
  })

  it('shows a machine-readable time on every message', async () => {
    await renderThread(rohan)

    for (const item of within(screen.getByRole('log')).getAllByRole('listitem')) {
      expect(item.querySelector('time')).toHaveAttribute('datetime')
    }
  })

  it('shows delivery status on own messages only', async () => {
    await renderThread(priya)

    expect(bubble('Done, it is in the Figma library')).toHaveTextContent('Read')
    expect(bubble('Is the new icon set final?')).not.toHaveTextContent('Read')
  })

  it.each([
    [ananya, 'Left my comments in the doc', 'Delivered'],
    [dev, 'Did the test devices arrive?', 'Failed to send'],
  ])('shows the status of the last message in %s', async (conversationId, text, status) => {
    await renderThread(conversationId)

    expect(bubble(text)).toHaveTextContent(status)
  })

  it('shows sent, then delivered, as the status changes', async () => {
    const { store } = await renderThread(rohan)
    const sent = await act(() =>
      store.dispatch(sendMessage({ conversationId: rohan, text: 'Fresh' })).unwrap(),
    )

    expect(bubble('Fresh')).toHaveTextContent('Sent')

    act(() => {
      store.dispatch(messageStatusChanged({ messageId: sent.id, status: 'delivered' }))
    })

    expect(bubble('Fresh')).toHaveTextContent('Delivered')
  })

  it('marks edited messages', async () => {
    await renderThread(ananya)

    expect(bubble('Yes, and it should default to annual')).toHaveTextContent('Edited')
    expect(bubble('Can you review the pricing page today?')).not.toHaveTextContent('Edited')
  })

  it('shows a deleted message without content or a reply action', async () => {
    await renderThread(trek, true)
    const deleted = bubble('You deleted this message')

    expect(deleted).not.toHaveTextContent('beat the heat')
    expect(within(deleted).queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows reactions with counts', async () => {
    await renderThread(priya)

    expect(bubble('Done, it is in the Figma library')).toHaveTextContent('❤️ 1')
  })

  it('keeps long unbroken text inside the bubble', async () => {
    const { store } = await renderThread(rohan)
    const url = `https://example.com/${'a'.repeat(300)}`

    await act(() => store.dispatch(sendMessage({ conversationId: rohan, text: url })))

    expect(screen.getByText(url)).toHaveClass('wrap-anywhere', 'whitespace-pre-wrap')
  })
})

describe('direct and group layouts', () => {
  it('leaves sender names off in a direct conversation', async () => {
    await renderThread(rohan)

    expect(screen.queryByText('Rohan Desai', { selector: 'p' })).not.toBeInTheDocument()
  })

  it('names the sender once per run in a group', async () => {
    await renderThread(trek, true)

    expect(screen.getAllByText('Sara Thomas', { selector: 'p' }).length).toBeGreaterThan(0)
    expect(screen.queryByText('You', { selector: 'p' })).not.toBeInTheDocument()
  })

  it('does not repeat the name within a run', async () => {
    const { store } = await renderThread(launch, true)
    const names = () => screen.getAllByText('Rohan Desai', { selector: 'p' }).length

    act(() => {
      store.dispatch(messageReceived(incoming(launch, 'message-a')))
    })
    const after = names()

    act(() => {
      store.dispatch(messageReceived(incoming(launch, 'message-b')))
    })

    expect(names()).toBe(after)
  })
})

describe('day dividers', () => {
  it('shows one divider per day', async () => {
    await renderThread(rohan)
    const log = screen.getByRole('log')

    expect(within(log).getAllByText(/day$/i).length).toBeGreaterThanOrEqual(2)
  })
})

describe('replies', () => {
  it('quotes the replied-to message and its sender', async () => {
    await renderThread(trek, true)
    const reply = bubble('Torch at 5:30 in the morning, fair')

    expect(reply).toHaveTextContent('Sara Thomas')
    expect(reply).toHaveTextContent('Packing list: water, torch, and proper shoes please')
  })

  it('updates the quote when the original is edited or deleted', async () => {
    const { store } = await renderThread(rohan)
    const original = toMessageId('message-rohan-4')
    await act(() =>
      store.dispatch(
        sendMessage({ conversationId: rohan, text: 'My reply', replyToMessageId: original }),
      ),
    )

    await act(() => store.dispatch(editMessage({ messageId: original, text: 'Changed' })))
    expect(bubble('My reply')).toHaveTextContent('Changed')

    await act(() => store.dispatch(deleteMessage(original)))
    expect(bubble('My reply')).toHaveTextContent('This message was deleted')
  })

  it('stays readable when the original is not loaded', async () => {
    const { store } = createTestStore()
    await store.dispatch(bootstrapApp())
    const reply = incoming(rohan, 'message-reply')

    store.dispatch(
      messageReceived({ ...reply, replyToMessageId: toMessageId('message-not-loaded') }),
    )
    await store.dispatch(fetchMessages({ conversationId: rohan }))
    renderWithProviders(
      <MessageList conversationId={rohan} onEdit={vi.fn()} onReply={vi.fn()} showSender={false} />,
      {
        store,
      },
    )

    expect(bubble('Text of message-reply')).toHaveTextContent('Original message')
  })
})

describe('states', () => {
  it('shows a labelled skeleton while loading', () => {
    renderWithProviders(
      <MessageList conversationId={rohan} onEdit={vi.fn()} onReply={vi.fn()} showSender={false} />,
    )

    expect(screen.getByRole('status', { name: 'Loading messages' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
  })

  it('invites the first message in an empty conversation', async () => {
    await renderThread(empty)

    expect(screen.getByText('No messages yet. Send the first one.')).toBeInTheDocument()
  })

  it('shows the error and retries', async () => {
    const { api, store } = createTestStore()
    api.failNextRequest()
    await store.dispatch(fetchMessages({ conversationId: rohan }))
    renderWithProviders(
      <MessageList conversationId={rohan} onEdit={vi.fn()} onReply={vi.fn()} showSender={false} />,
      {
        store,
      },
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Check your connection')

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Want me to sign us both up?')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps loaded messages visible when loading older ones fails', async () => {
    const { api, user } = await renderThread(launch, true)
    api.failNextRequest()

    await user.click(screen.getByRole('button', { name: 'Load earlier messages' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('I will bring the test devices')).toBeInTheDocument()
  })

  it('loads earlier messages on request, then removes the button', async () => {
    const { user } = await renderThread(launch, true)
    const list = () => within(screen.getByRole('log')).getAllByRole('listitem')
    expect(list()).toHaveLength(30)

    await user.click(screen.getByRole('button', { name: 'Load earlier messages' }))

    expect(await screen.findByText(/Two weeks to launch/)).toBeInTheDocument()
    expect(list()).toHaveLength(34)
    expect(screen.queryByRole('button', { name: 'Load earlier messages' })).not.toBeInTheDocument()
  })
})

describe('rendering efficiency', () => {
  it('renders only the new bubble when a message arrives', async () => {
    const { store } = await renderThread(launch, true)
    timestampRenders.count = 0

    act(() => {
      store.dispatch(messageReceived(incoming(launch, 'message-new')))
    })

    expect(timestampRenders.count).toBe(1)
  })

  it('renders only the affected bubble when a status changes', async () => {
    const { store } = await renderThread(rohan)
    const sent = await act(() =>
      store.dispatch(sendMessage({ conversationId: rohan, text: 'Fresh' })).unwrap(),
    )
    timestampRenders.count = 0

    act(() => {
      store.dispatch(messageStatusChanged({ messageId: sent.id, status: 'delivered' }))
    })

    expect(timestampRenders.count).toBe(1)
  })

  it('renders nothing for a message in another conversation', async () => {
    const { store } = await renderThread(rohan)
    timestampRenders.count = 0

    act(() => {
      store.dispatch(messageReceived(incoming(priya, 'message-other')))
    })

    expect(timestampRenders.count).toBe(0)
  })
})
