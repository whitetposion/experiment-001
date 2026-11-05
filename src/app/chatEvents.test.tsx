import { render } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  conversationSelected,
  fetchConversations,
  selectAllConversations,
  selectConversationById,
  selectConversationPreview,
  selectIsDirectContactOnline,
  selectTypingLabel,
  selectUnreadCount,
} from '@/features/conversations'
import {
  fetchMessages,
  selectMessageById,
  selectThreadMessageIds,
  sendMessage,
} from '@/features/messages'
import { fetchDirectory, selectTypingUserIds } from '@/features/presence'
import { createRandom } from '@/lib/createRandom'
import type { ChatEvent } from '@/services/chatApi'
import type { MockChatApi } from '@/services/mock-api/createMockChatApi'
import { createSimulatedChatApi } from '@/services/simulation/createSimulatedChatApi'
import { createTestStore } from '@/test/store'
import { toConversationId, toUserId } from '@/types/ids'
import { App } from './App'
import { bootstrapApp } from './bootstrap'
import { connectChatEvents } from './chatEvents'
import { AppProviders } from './providers'
import { makeStore } from './store'

const rohan = toConversationId('conversation-rohan')
const priya = toConversationId('conversation-priya')
const launch = toConversationId('conversation-launch')
const rohanId = toUserId('user-rohan')
const priyaId = toUserId('user-priya')
const devId = toUserId('user-dev')

async function settle<Result>(promise: Promise<Result>) {
  await vi.advanceTimersByTimeAsync(0)
  return promise
}

async function connected() {
  const context = createTestStore({ now: () => new Date() })
  const disconnect = context.store.dispatch(connectChatEvents())
  await settle(context.store.dispatch(fetchDirectory()))
  await settle(context.store.dispatch(fetchConversations()))
  return { ...context, disconnect }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T12:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('applying events to Redux', () => {
  it('adds an incoming message, moves the chat up and counts it as unread', async () => {
    const { api, store } = await connected()

    api.backend.deliverMessage(priya, priyaId, 'New message')

    expect(selectAllConversations(store.getState())[0]?.id).toBe(priya)
    expect(selectUnreadCount(store.getState(), priya)).toBe(1)
    expect(selectConversationPreview(store.getState(), priya)?.text).toBe('New message')
  })

  it('marks a message read at once if its chat is open', async () => {
    const { api, store } = await connected()
    store.dispatch(conversationSelected(priya))

    api.backend.deliverMessage(priya, priyaId, 'New message')
    await vi.advanceTimersByTimeAsync(0)

    expect(selectUnreadCount(store.getState(), priya)).toBe(0)

    const list = await settle(api.getConversations())
    expect(list.conversations.find(({ id }) => id === priya)?.unread.count).toBe(0)
  })

  it('updates delivery status on a message', async () => {
    const { api, store } = await connected()
    const sent = await settle(
      store.dispatch(sendMessage({ conversationId: rohan, text: 'Hi' })).unwrap(),
    )

    api.backend.changeDeliveryStatus(sent.id, 'delivered')
    expect(selectMessageById(store.getState(), sent.id)?.deliveryStatus).toBe('delivered')

    api.backend.changeDeliveryStatus(sent.id, 'read')
    expect(selectMessageById(store.getState(), sent.id)?.deliveryStatus).toBe('read')
    expect(selectConversationPreview(store.getState(), rohan)?.deliveryStatus).toBe('read')
  })

  it('ignores a late status event', async () => {
    const { api, store } = await connected()
    const sent = await settle(
      store.dispatch(sendMessage({ conversationId: rohan, text: 'Hi' })).unwrap(),
    )
    api.backend.changeDeliveryStatus(sent.id, 'read')

    api.backend.changeDeliveryStatus(sent.id, 'delivered')

    expect(selectMessageById(store.getState(), sent.id)?.deliveryStatus).toBe('read')
  })

  it('updates online status', async () => {
    const { api, store } = await connected()
    expect(selectIsDirectContactOnline(store.getState(), rohan)).toBe(true)

    api.backend.changePresence(rohanId, 'offline')

    expect(selectIsDirectContactOnline(store.getState(), rohan)).toBe(false)
  })

  it('shows and clears typing', async () => {
    const { api, store } = await connected()

    api.backend.startTyping(rohan, rohanId, 5000)
    expect(selectTypingLabel(store.getState(), rohan)).toBe('typing…')

    api.backend.stopTyping(rohan, rohanId)
    expect(selectTypingLabel(store.getState(), rohan)).toBeNull()
  })

  it('names who is typing in a group', async () => {
    const { api, store } = await connected()

    api.backend.startTyping(launch, priyaId, 5000)
    expect(selectTypingLabel(store.getState(), launch)).toBe('Priya is typing…')

    api.backend.startTyping(launch, devId, 5000)
    expect(selectTypingLabel(store.getState(), launch)).toBe('Priya and Dev are typing…')

    api.backend.startTyping(launch, toUserId('user-arjun'), 5000)
    expect(selectTypingLabel(store.getState(), launch)).toBe('Several people are typing…')
  })
})

describe('typing expiry', () => {
  it('clears an indicator whose stop event never arrives', async () => {
    const { api, store } = await connected()

    api.backend.startTyping(rohan, rohanId, 5000)
    await vi.advanceTimersByTimeAsync(4999)
    expect(selectTypingUserIds(store.getState(), rohan)).toEqual([rohanId])

    await vi.advanceTimersByTimeAsync(1)
    expect(selectTypingUserIds(store.getState(), rohan)).toEqual([])
  })

  it('restarts the expiry when typing continues', async () => {
    const { api, store } = await connected()

    api.backend.startTyping(rohan, rohanId, 5000)
    await vi.advanceTimersByTimeAsync(4000)
    api.backend.startTyping(rohan, rohanId, 5000)
    await vi.advanceTimersByTimeAsync(4000)

    expect(selectTypingUserIds(store.getState(), rohan)).toEqual([rohanId])
  })

  it('cancels the expiry timer when typing stops', async () => {
    const { api } = await connected()

    api.backend.startTyping(rohan, rohanId, 5000)
    api.backend.stopTyping(rohan, rohanId)

    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('disconnecting', () => {
  it('stops applying events and clears its timers', async () => {
    const { api, disconnect, store } = await connected()
    api.backend.startTyping(rohan, rohanId, 5000)

    disconnect()
    api.backend.deliverMessage(priya, priyaId, 'Too late')

    expect(vi.getTimerCount()).toBe(0)
    expect(selectUnreadCount(store.getState(), priya)).toBe(0)
  })
})

describe('the running app', () => {
  function simulatedStore(seed = 3) {
    const api = createSimulatedChatApi({
      latencyMs: { min: 0, max: 0 },
      simulation: { random: createRandom(seed) },
    })
    return { api, store: makeStore({ api }) }
  }

  it('starts on mount and leaves no timers after unmount', async () => {
    const { store } = simulatedStore()
    await settle(store.dispatch(bootstrapApp()))

    const { unmount } = render(
      <AppProviders store={store}>
        <App />
      </AppProviders>,
    )
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    unmount()
    await vi.advanceTimersByTimeAsync(0)

    expect(vi.getTimerCount()).toBe(0)
  })

  it('survives the double mount of StrictMode', async () => {
    const { api, store } = simulatedStore()
    await settle(store.dispatch(bootstrapApp()))
    const listener = vi.spyOn(api.backend, 'changePresence')

    const { unmount } = render(
      <StrictMode>
        <AppProviders store={store}>
          <App />
        </AppProviders>
      </StrictMode>,
    )

    await vi.advanceTimersByTimeAsync(31_000)
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(listener.mock.calls.length).toBeLessThanOrEqual(3)

    unmount()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('a long session', () => {
  async function runSession(api: MockChatApi, store: ReturnType<typeof makeStore>) {
    const events: ChatEvent[] = []
    const stopRecording = api.subscribe((event) => events.push(event))
    const disconnect = store.dispatch(connectChatEvents())
    await settle(store.dispatch(bootstrapApp()))
    await settle(store.dispatch(fetchMessages({ conversationId: rohan })))
    let maxTimers = 0

    for (let minute = 0; minute < 60; minute += 1) {
      await settle(
        store.dispatch(sendMessage({ conversationId: rohan, text: `Minute ${String(minute)}` })),
      )
      await vi.advanceTimersByTimeAsync(60_000)
      maxTimers = Math.max(maxTimers, vi.getTimerCount())
    }

    return { disconnect, events, maxTimers, stopRecording }
  }

  it('stays bounded and consistent for an hour, then cleans up', async () => {
    const api = createSimulatedChatApi({
      latencyMs: { min: 0, max: 0 },
      simulation: { random: createRandom(9) },
    })
    const store = makeStore({ api })
    const error = vi.spyOn(console, 'error')
    const { disconnect, events, maxTimers, stopRecording } = await runSession(api, store)

    expect(events.length).toBeGreaterThan(200)
    expect(maxTimers).toBeLessThan(20)
    expect(error).not.toHaveBeenCalled()

    // Delivery status only ever moves forward.
    const order = ['sent', 'delivered', 'read']
    const seen = new Map<string, number>()

    for (const event of events) {
      if (event.type === 'message-status-changed') {
        const rank = order.indexOf(event.status)
        expect(rank).toBeGreaterThan(seen.get(event.messageId) ?? 0)
        seen.set(event.messageId, rank)
      }
    }

    // Redux and the backend tell the same story.
    const page = await settle(api.getMessages(rohan, { limit: 1000 }))
    const stored = selectThreadMessageIds(store.getState(), rohan)

    expect(stored.slice(-page.messages.length)).toEqual(page.messages.map(({ id }) => id))
    expect(new Set(stored).size).toBe(stored.length)

    for (const message of page.messages) {
      expect(selectMessageById(store.getState(), message.id)).toEqual(message)
    }

    const { conversations } = await settle(api.getConversations())
    for (const conversation of conversations) {
      expect(selectConversationById(store.getState(), conversation.id)?.lastMessageId).toBe(
        conversation.lastMessageId,
      )
      expect(selectUnreadCount(store.getState(), conversation.id)).toBe(conversation.unread.count)
    }

    stopRecording()
    disconnect()

    expect(vi.getTimerCount()).toBe(0)
    expect(selectTypingUserIds(store.getState(), rohan)).toEqual([])
  })
})
