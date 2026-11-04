import { act, render } from '@testing-library/react'
import { memo, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  fetchConversations,
  selectConversationPreview,
  selectConversationTitle,
  selectUnreadCount,
  selectVisibleConversationIds,
} from '@/features/conversations'
import { messageReceived } from '@/features/messages'
import { fetchDirectory, presenceChanged, typingStarted } from '@/features/presence'
import { TEST_NOW, createTestStore } from '@/test/store'
import { toConversationId, toMessageId, toUserId, type ConversationId } from '@/types/ids'
import type { ActiveMessage } from '@/types/message'
import { useAppSelector } from './hooks'

// Counts real renders, to show which updates reach which components.
let listRenders = 0
let rowRenders: Partial<Record<ConversationId, number>> = {}

const Row = memo(function Row({ id }: { id: ConversationId }) {
  // eslint-disable-next-line react-hooks/immutability -- counting renders is this test's purpose
  rowRenders[id] = (rowRenders[id] ?? 0) + 1
  const title = useAppSelector((state) => selectConversationTitle(state, id))
  const unread = useAppSelector((state) => selectUnreadCount(state, id))
  const preview = useAppSelector((state) => selectConversationPreview(state, id))

  return <li>{`${title} ${String(unread)} ${preview?.text ?? ''}`}</li>
})

function List() {
  // eslint-disable-next-line react-hooks/globals -- counting renders is this test's purpose
  listRenders += 1
  const ids = useAppSelector(selectVisibleConversationIds)

  return (
    <ul>
      {ids.map((id) => (
        <Row id={id} key={id} />
      ))}
    </ul>
  )
}

const rohan = toConversationId('conversation-rohan')
const launch = toConversationId('conversation-launch')
const priya = toConversationId('conversation-priya')

function incoming(conversationId: ConversationId, id: string): ActiveMessage {
  return {
    id: toMessageId(id),
    conversationId,
    senderId: toUserId('user-dev'),
    createdAt: TEST_NOW.toISOString(),
    replyToMessageId: null,
    deliveryStatus: 'delivered',
    state: 'active',
    text: 'New',
    editedAt: null,
    reactions: [],
    attachments: [],
  }
}

async function renderList() {
  const { store } = createTestStore()
  await store.dispatch(fetchDirectory())
  await store.dispatch(fetchConversations())

  function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }

  render(<List />, { wrapper: Wrapper })
  listRenders = 0
  rowRenders = {}
  return store
}

describe('selector-driven rendering', () => {
  beforeEach(() => {
    listRenders = 0
    rowRenders = {}
  })

  it('re-renders only the affected row when a conversation changes in place', async () => {
    const store = await renderList()

    act(() => {
      store.dispatch(messageReceived(incoming(launch, 'message-new')))
    })

    expect(rowRenders).toEqual({ [launch]: 1 })
    expect(listRenders).toBe(0)
  })

  it('re-renders the list but no other rows when the order changes', async () => {
    const store = await renderList()

    act(() => {
      store.dispatch(messageReceived(incoming(priya, 'message-new')))
    })

    expect(listRenders).toBe(1)
    expect(rowRenders).toEqual({ [priya]: 1 })
  })

  it('re-renders nothing for state the list does not read', async () => {
    const store = await renderList()

    act(() => {
      store.dispatch(
        presenceChanged({ userId: toUserId('user-rohan'), status: 'offline', lastSeenAt: null }),
      )
      store.dispatch(
        typingStarted({
          conversationId: rohan,
          userId: toUserId('user-rohan'),
          startedAt: TEST_NOW.toISOString(),
          expiresAt: TEST_NOW.toISOString(),
        }),
      )
    })

    expect(listRenders).toBe(0)
    expect(rowRenders).toEqual({})
  })
})
