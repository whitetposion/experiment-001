import { describe, expect, it } from 'vitest'
import { fetchDirectory } from '@/features/presence'
import { TEST_NOW, createTestStore } from '@/test/store'
import { toConversationId, toMessageId, toUserId } from '@/types/ids'
import type { ActiveMessage, MessageDeliveryStatus } from '@/types/message'
import { canChangeDeliveryStatus } from './deliveryStatus'
import {
  selectIsOwnMessage,
  selectMessageById,
  selectReactionSummary,
  selectReplyTarget,
  selectThreadError,
  selectThreadHasMore,
  selectThreadMessageIds,
  selectThreadStatus,
} from './selectors'
import { messageReceived, messagesReceived, messageStatusChanged } from './slice'
import {
  addReaction,
  deleteMessage,
  editMessage,
  fetchMessages,
  removeReaction,
  sendMessage,
} from './thunks'

const rohan = toConversationId('conversation-rohan')
const launch = toConversationId('conversation-launch')
const ownMessage = toMessageId('message-rohan-4')

function incoming(id: string): ActiveMessage {
  return {
    id: toMessageId(id),
    conversationId: rohan,
    senderId: toUserId('user-rohan'),
    createdAt: TEST_NOW.toISOString(),
    replyToMessageId: null,
    deliveryStatus: 'delivered',
    state: 'active',
    text: 'Incoming',
    editedAt: null,
    reactions: [],
    attachments: [],
  }
}

describe('loading a thread', () => {
  it('tracks status and stores messages by ID, in order', async () => {
    const { store } = createTestStore()

    const request = store.dispatch(fetchMessages({ conversationId: rohan }))
    expect(selectThreadStatus(store.getState(), rohan)).toBe('loading')
    await request

    const ids = selectThreadMessageIds(store.getState(), rohan)
    expect(selectThreadStatus(store.getState(), rohan)).toBe('succeeded')
    expect(ids).toHaveLength(6)
    expect(ids.every((id) => selectMessageById(store.getState(), id)?.id === id)).toBe(true)
  })

  it('records a failure as a plain, serializable value', async () => {
    const { api, store } = createTestStore()
    api.failNextRequest()

    await store.dispatch(fetchMessages({ conversationId: rohan }))

    expect(selectThreadStatus(store.getState(), rohan)).toBe('failed')
    expect(selectThreadError(store.getState(), rohan)).toMatchObject({
      code: 'network',
      retryable: true,
    })
  })

  it('clears the error when retrying', async () => {
    const { api, store } = createTestStore()
    api.failNextRequest()
    await store.dispatch(fetchMessages({ conversationId: rohan }))

    await store.dispatch(fetchMessages({ conversationId: rohan }))

    expect(selectThreadError(store.getState(), rohan)).toBeNull()
    expect(selectThreadStatus(store.getState(), rohan)).toBe('succeeded')
  })

  it('treats a cancelled request as idle, not failed', async () => {
    const { store } = createTestStore({ latencyMs: { min: 50, max: 50 } })

    const request = store.dispatch(fetchMessages({ conversationId: rohan }))
    request.abort()
    await request

    expect(selectThreadStatus(store.getState(), rohan)).toBe('idle')
    expect(selectThreadError(store.getState(), rohan)).toBeNull()
  })

  it('puts older pages before the loaded messages', async () => {
    const { store } = createTestStore()
    await store.dispatch(fetchMessages({ conversationId: launch }))
    const newest = selectThreadMessageIds(store.getState(), launch)
    const before = newest[0]

    expect(selectThreadHasMore(store.getState(), launch)).toBe(true)
    await store.dispatch(fetchMessages({ conversationId: launch, ...(before ? { before } : {}) }))

    const all = selectThreadMessageIds(store.getState(), launch)
    expect(all).toHaveLength(34)
    expect(all.slice(-newest.length)).toEqual(newest)
    expect(selectThreadHasMore(store.getState(), launch)).toBe(false)
  })

  it('lists a message once when it finishes sending before the first page arrives', async () => {
    // The page waits for the full delay and the send for none, so the send finishes first.
    const delays = [1, 0]
    const { store } = createTestStore({
      latencyMs: { min: 0, max: 20 },
      random: () => delays.shift() ?? 0.5,
    })

    const page = store.dispatch(fetchMessages({ conversationId: rohan }))
    const sent = await store
      .dispatch(sendMessage({ conversationId: rohan, text: 'Quick' }))
      .unwrap()

    expect(selectThreadMessageIds(store.getState(), rohan)).toEqual([sent.id])
    await page

    const ids = selectThreadMessageIds(store.getState(), rohan)
    expect(ids).toHaveLength(7)
    expect(ids.filter((id) => id === sent.id)).toHaveLength(1)
    expect(ids.at(-1)).toBe(sent.id)
  })

  it('keeps a message received while the first page is still loading', async () => {
    const { store } = createTestStore({ latencyMs: { min: 5, max: 5 } })

    const page = store.dispatch(fetchMessages({ conversationId: rohan }))
    store.dispatch(messageReceived(incoming('message-live')))
    await page

    expect(selectThreadMessageIds(store.getState(), rohan).at(-1)).toBe('message-live')
  })
})

describe('storing messages', () => {
  it('keeps preview messages out of the thread', () => {
    const { store } = createTestStore()

    store.dispatch(messagesReceived([incoming('message-preview')]))

    expect(selectMessageById(store.getState(), toMessageId('message-preview'))).toBeDefined()
    expect(selectThreadMessageIds(store.getState(), rohan)).toEqual([])
  })

  it('adds a received message once', () => {
    const { store } = createTestStore()

    store.dispatch(messageReceived(incoming('message-live')))
    store.dispatch(messageReceived(incoming('message-live')))

    expect(selectThreadMessageIds(store.getState(), rohan)).toEqual(['message-live'])
  })

  it('appends a sent message and stores replies as references', async () => {
    const { store } = createTestStore()
    await store.dispatch(fetchMessages({ conversationId: rohan }))

    const sent = await store
      .dispatch(sendMessage({ conversationId: rohan, text: 'Reply', replyToMessageId: ownMessage }))
      .unwrap()

    expect(selectThreadMessageIds(store.getState(), rohan).at(-1)).toBe(sent.id)
    expect(selectReplyTarget(store.getState(), sent.id)?.id).toBe(ownMessage)
  })

  it('leaves the thread unchanged when sending fails', async () => {
    const { api, store } = createTestStore()
    await store.dispatch(fetchMessages({ conversationId: rohan }))
    const before = selectThreadMessageIds(store.getState(), rohan)
    api.failNextRequest()

    const result = await store.dispatch(sendMessage({ conversationId: rohan, text: 'Lost' }))

    expect(sendMessage.rejected.match(result)).toBe(true)
    expect(selectThreadMessageIds(store.getState(), rohan)).toBe(before)
  })

  it('applies edits and deletes to the stored message, keeping its position', async () => {
    const { store } = createTestStore()
    await store.dispatch(fetchMessages({ conversationId: rohan }))
    const ids = selectThreadMessageIds(store.getState(), rohan)

    await store.dispatch(editMessage({ messageId: ownMessage, text: 'Edited' }))
    expect(selectMessageById(store.getState(), ownMessage)).toMatchObject({ text: 'Edited' })

    await store.dispatch(deleteMessage(ownMessage))
    expect(selectMessageById(store.getState(), ownMessage)?.state).toBe('deleted')
    expect(selectThreadMessageIds(store.getState(), rohan)).toEqual(ids)
  })

  it('reports whether a message is from the current user', async () => {
    const { store } = createTestStore()
    await store.dispatch(fetchDirectory())
    await store.dispatch(fetchMessages({ conversationId: rohan }))

    expect(selectIsOwnMessage(store.getState(), ownMessage)).toBe(true)
    expect(selectIsOwnMessage(store.getState(), toMessageId('message-rohan-1'))).toBe(false)
  })
})

describe('reactions', () => {
  const messageId = toMessageId('message-launch-19')

  async function loaded() {
    const context = createTestStore()
    await context.store.dispatch(fetchDirectory())
    await context.store.dispatch(fetchMessages({ conversationId: launch }))
    return context
  }

  it('summarizes by emoji and marks the current user', async () => {
    const { store } = await loaded()

    expect(selectReactionSummary(store.getState(), messageId)).toEqual([
      { emoji: '🚀', count: 3, reactedByCurrentUser: true },
    ])
  })

  it('updates when the current user adds and removes a reaction', async () => {
    const { store } = await loaded()

    await store.dispatch(addReaction({ messageId, emoji: '🎉' }))
    expect(selectReactionSummary(store.getState(), messageId)).toContainEqual({
      emoji: '🎉',
      count: 1,
      reactedByCurrentUser: true,
    })

    await store.dispatch(removeReaction({ messageId, emoji: '🚀' }))
    expect(selectReactionSummary(store.getState(), messageId)).toContainEqual({
      emoji: '🚀',
      count: 2,
      reactedByCurrentUser: false,
    })
  })

  it('returns one shared empty list for messages without reactions', async () => {
    const { store } = await loaded()
    const first = selectReactionSummary(store.getState(), toMessageId('message-launch-1'))
    const second = selectReactionSummary(store.getState(), toMessageId('message-launch-2'))

    expect(first).toEqual([])
    expect(first).toBe(second)
  })

  it('returns no reactions for a deleted or unknown message', () => {
    const { store } = createTestStore()

    expect(selectReactionSummary(store.getState(), toMessageId('message-missing'))).toEqual([])
  })
})

describe('delivery status', () => {
  it.each<[MessageDeliveryStatus, MessageDeliveryStatus, boolean]>([
    ['sending', 'sent', true],
    ['sending', 'failed', true],
    ['sent', 'delivered', true],
    ['sent', 'read', true],
    ['delivered', 'read', true],
    ['failed', 'sending', true],
    ['read', 'delivered', false],
    ['delivered', 'sent', false],
    ['read', 'failed', false],
    ['sent', 'sending', false],
    ['sent', 'sent', false],
  ])('%s to %s: %s', (current, next, allowed) => {
    expect(canChangeDeliveryStatus(current, next)).toBe(allowed)
  })

  it('moves forward and ignores late events', async () => {
    const { store } = createTestStore()
    await store.dispatch(fetchMessages({ conversationId: rohan }))
    const sent = await store.dispatch(sendMessage({ conversationId: rohan, text: 'Hi' })).unwrap()
    const statusOf = () => selectMessageById(store.getState(), sent.id)?.deliveryStatus

    store.dispatch(messageStatusChanged({ messageId: sent.id, status: 'read' }))
    expect(statusOf()).toBe('read')

    store.dispatch(messageStatusChanged({ messageId: sent.id, status: 'delivered' }))
    expect(statusOf()).toBe('read')
  })

  it('ignores an unknown message', () => {
    const { store } = createTestStore()
    const before = store.getState()

    store.dispatch(messageStatusChanged({ messageId: toMessageId('nope'), status: 'read' }))

    expect(store.getState().messages).toBe(before.messages)
  })
})

describe('selector stability', () => {
  it('returns one shared empty list for an unloaded thread', () => {
    const { store } = createTestStore()

    expect(selectThreadMessageIds(store.getState(), rohan)).toBe(
      selectThreadMessageIds(store.getState(), launch),
    )
  })

  it('keeps a reaction summary when an unrelated message changes', async () => {
    const { store } = createTestStore()
    await store.dispatch(fetchDirectory())
    await store.dispatch(fetchMessages({ conversationId: launch }))
    const messageId = toMessageId('message-launch-19')
    const before = selectReactionSummary(store.getState(), messageId)

    store.dispatch(messageReceived(incoming('message-unrelated')))

    expect(selectReactionSummary(store.getState(), messageId)).toBe(before)
  })
})
