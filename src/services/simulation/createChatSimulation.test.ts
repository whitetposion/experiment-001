import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatEvent } from '@/services/chatApi'
import { createMockChatApi } from '@/services/mock-api/createMockChatApi'
import { createRandom } from '@/lib/createRandom'
import { toConversationId, toUserId, type MessageId } from '@/types/ids'
import {
  createChatSimulation,
  type ChatSimulationOptions,
  type SimulationTiming,
} from './createChatSimulation'
import { createSimulatedChatApi } from './createSimulatedChatApi'

const fixed = (ms: number) => ({ min: ms, max: ms })

// Presence and unprompted messages stay out of the way unless a test asks for them.
const TIMING: SimulationTiming = {
  deliveredAfterMs: fixed(100),
  readAfterMs: fixed(200),
  replyAfterMs: fixed(300),
  typingForMs: fixed(400),
  presenceEveryMs: fixed(10_000_000),
  incomingEveryMs: fixed(10_000_000),
}

const rohan = toConversationId('conversation-rohan')
const kabir = toConversationId('conversation-kabir')
const launch = toConversationId('conversation-launch')
const rohanId = toUserId('user-rohan')
const kabirId = toUserId('user-kabir')

function setup(options: ChatSimulationOptions = {}) {
  const api = createMockChatApi({ latencyMs: { min: 0, max: 0 } })
  const events: ChatEvent[] = []
  api.subscribe((event) => events.push(event))
  const simulation = createChatSimulation(api.backend, {
    random: createRandom(1),
    timing: TIMING,
    ...options,
  })

  async function send(conversationId = rohan) {
    const pending = api.sendMessage({ conversationId, text: 'Hello' })
    await vi.advanceTimersByTimeAsync(0)
    return pending
  }

  return { api, events, send, simulation }
}

const types = (events: ChatEvent[]) => events.map(({ type }) => type)
const statusesOf = (events: ChatEvent[], messageId: MessageId) =>
  events.flatMap((event) =>
    event.type === 'message-status-changed' && event.messageId === messageId ? [event.status] : [],
  )

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T12:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('delivery and read status', () => {
  it('moves a sent message to delivered, then read, in order and on time', async () => {
    const { events, send, simulation } = setup()
    simulation.start()
    const message = await send()

    await vi.advanceTimersByTimeAsync(99)
    expect(statusesOf(events, message.id)).toEqual([])

    await vi.advanceTimersByTimeAsync(1)
    expect(statusesOf(events, message.id)).toEqual(['delivered'])

    await vi.advanceTimersByTimeAsync(200)
    expect(statusesOf(events, message.id)).toEqual(['delivered', 'read'])
  })

  it('updates the backend too, so a later request agrees', async () => {
    const { api, send, simulation } = setup()
    simulation.start()
    const message = await send()

    await vi.advanceTimersByTimeAsync(300)

    const page = api.getMessages(rohan)
    await vi.advanceTimersByTimeAsync(0)
    expect((await page).messages.at(-1)).toMatchObject({
      id: message.id,
      deliveryStatus: 'read',
    })
  })

  it('holds a direct message at sent while the recipient is offline', async () => {
    const { events, send, simulation } = setup()
    simulation.start()

    const message = await send(kabir)
    await vi.advanceTimersByTimeAsync(5000)

    expect(statusesOf(events, message.id)).toEqual([])
  })

  it('delivers waiting messages when the recipient comes online', async () => {
    // 0.25 always picks Kabir, the third of the nine other people.
    const { api, events, send, simulation } = setup({
      timing: { ...TIMING, presenceEveryMs: fixed(1000) },
      random: () => 0.25,
    })
    expect(api.backend.getOtherUserIds()[2]).toBe(kabirId)
    simulation.start()

    const message = await send(kabir)
    await vi.advanceTimersByTimeAsync(999)
    expect(statusesOf(events, message.id)).toEqual([])

    await vi.advanceTimersByTimeAsync(301)

    expect(api.backend.isOnline(kabirId)).toBe(true)
    expect(statusesOf(events, message.id)).toEqual(['delivered', 'read'])
  })

  it('does not deliver twice when someone returns during delivery', async () => {
    // Rohan leaves at 50 and returns at 100, while the message is still on its way at 300.
    const { api, events, send, simulation } = setup({
      timing: { ...TIMING, presenceEveryMs: fixed(50), deliveredAfterMs: fixed(300) },
      random: () => 0.1,
    })
    expect(api.backend.getOtherUserIds()[0]).toBe(rohanId)
    simulation.start()

    const message = await send()
    await vi.advanceTimersByTimeAsync(2000)

    expect(statusesOf(events, message.id)).toEqual(['delivered', 'read'])
  })
})

describe('replies', () => {
  it('types, stops, then sends, in a direct conversation', async () => {
    const { events, send, simulation } = setup()
    simulation.start()
    await send()

    await vi.advanceTimersByTimeAsync(100 + 200 + 300)
    expect(events.at(-1)).toMatchObject({ type: 'typing-started' })
    expect(events.at(-1)).toMatchObject({
      indicator: { conversationId: rohan, userId: rohanId },
    })

    await vi.advanceTimersByTimeAsync(400)
    expect(types(events).slice(-2)).toEqual(['typing-stopped', 'message-received'])
    expect(events.at(-1)).toMatchObject({
      message: { conversationId: rohan, senderId: rohanId, deliveryStatus: 'delivered' },
    })
  })

  it('stores the reply, and counts it as unread on the server', async () => {
    const { api, send, simulation } = setup()
    simulation.start()
    await send()
    await vi.advanceTimersByTimeAsync(1000)

    const list = api.getConversations()
    await vi.advanceTimersByTimeAsync(0)
    const { conversations, lastMessages } = await list
    const conversation = conversations.find(({ id }) => id === rohan)

    expect(conversation?.unread.count).toBe(3)
    expect(lastMessages.map(({ id }) => id)).toContain(conversation?.lastMessageId)
  })

  it('has an online member reply in a group, sometimes', async () => {
    const replying = setup({ groupReplyChance: 1 })
    replying.simulation.start()
    await replying.send(launch)
    await vi.advanceTimersByTimeAsync(1000)
    const reply = replying.events.find(({ type }) => type === 'message-received')

    expect(reply).toBeDefined()
    replying.simulation.stop()

    const quiet = setup({ groupReplyChance: 0 })
    quiet.simulation.start()
    await quiet.send(launch)
    await vi.advanceTimersByTimeAsync(1000)

    expect(quiet.events.some(({ type }) => type === 'message-received')).toBe(false)
  })

  it('drops a reply from someone removed while it was on its way', async () => {
    const { api, events, send, simulation } = setup({
      groupReplyChance: 1,
      random: () => 0,
    })
    simulation.start()
    await send(launch)
    await vi.advanceTimersByTimeAsync(100 + 200 + 300)
    const typingEvent = events.find((event) => event.type === 'typing-started')

    if (typingEvent?.type !== 'typing-started') {
      throw new Error('Expected someone to be typing')
    }

    const removal = api.removeGroupMember({
      conversationId: launch,
      userId: typingEvent.indicator.userId,
    })
    await vi.advanceTimersByTimeAsync(0)
    await removal
    await vi.advanceTimersByTimeAsync(400)

    expect(types(events)).toContain('typing-stopped')
    expect(types(events)).not.toContain('message-received')
  })

  it('does not start typing for someone removed before their turn', async () => {
    const { api, events, send, simulation } = setup({ groupReplyChance: 1, random: () => 0 })
    simulation.start()
    await send(launch)
    await vi.advanceTimersByTimeAsync(100 + 200)
    const responder = toUserId('user-ananya')

    const removal = api.removeGroupMember({ conversationId: launch, userId: responder })
    await vi.advanceTimersByTimeAsync(0)
    await removal
    await vi.advanceTimersByTimeAsync(1000)

    expect(types(events)).not.toContain('typing-started')
    expect(types(events)).not.toContain('message-received')
  })

  it('drops a reply when the user leaves while it is being typed', async () => {
    const { api, events, simulation } = setup({ groupReplyChance: 1, random: () => 0 })
    const trek = toConversationId('conversation-trek')
    simulation.start()
    const sending = api.sendMessage({ conversationId: trek, text: 'Hello' })
    await vi.advanceTimersByTimeAsync(0)
    await sending
    await vi.advanceTimersByTimeAsync(100 + 200 + 300)
    expect(events.at(-1)?.type).toBe('typing-started')

    const leaving = api.removeGroupMember({
      conversationId: trek,
      userId: api.backend.currentUserId,
    })
    await vi.advanceTimersByTimeAsync(0)
    await leaving
    await vi.advanceTimersByTimeAsync(400)

    expect(events.at(-1)?.type).toBe('typing-stopped')
    expect(types(events)).not.toContain('message-received')
  })

  it('drops a reply to a group the user has left', async () => {
    const { api, events, simulation } = setup({ groupReplyChance: 1, random: () => 0 })
    const trek = toConversationId('conversation-trek')
    simulation.start()
    const sending = api.sendMessage({ conversationId: trek, text: 'Hello' })
    await vi.advanceTimersByTimeAsync(0)
    await sending

    const leaving = api.removeGroupMember({
      conversationId: trek,
      userId: api.backend.currentUserId,
    })
    await vi.advanceTimersByTimeAsync(0)
    await leaving
    await vi.advanceTimersByTimeAsync(2000)

    expect(types(events)).not.toContain('message-received')
    expect(types(events)).not.toContain('typing-started')
  })
})

describe('presence', () => {
  it('changes one person at a time, never the current user', async () => {
    const { api, events, simulation } = setup({
      timing: { ...TIMING, presenceEveryMs: fixed(100) },
    })
    simulation.start()

    await vi.advanceTimersByTimeAsync(5000)

    const changes = events.flatMap((event) =>
      event.type === 'presence-changed' ? [event.presence] : [],
    )
    expect(changes).toHaveLength(50)
    expect(changes.some(({ userId }) => userId === api.backend.currentUserId)).toBe(false)
  })

  it('flips the status and records when', async () => {
    const { api, events, simulation } = setup({
      timing: { ...TIMING, presenceEveryMs: fixed(100) },
      random: () => 0,
    })
    const first = api.backend.getOtherUserIds()[0] ?? rohanId
    const wasOnline = api.backend.isOnline(first)
    simulation.start()

    await vi.advanceTimersByTimeAsync(100)

    expect(api.backend.isOnline(first)).toBe(!wasOnline)
    expect(events[0]).toMatchObject({
      type: 'presence-changed',
      presence: { userId: first, lastSeenAt: new Date().toISOString() },
    })
  })
})

describe('unprompted messages', () => {
  it('arrive from an online person, after they type', async () => {
    const { api, events, simulation } = setup({
      timing: { ...TIMING, incomingEveryMs: fixed(1000) },
    })
    simulation.start()

    await vi.advanceTimersByTimeAsync(3000)

    const received = events.flatMap((event) =>
      event.type === 'message-received' ? [event.message] : [],
    )
    expect(received.length).toBeGreaterThan(0)
    expect(received.every(({ senderId }) => api.backend.isOnline(senderId))).toBe(true)
    expect(types(events).indexOf('typing-started')).toBeLessThan(
      types(events).indexOf('message-received'),
    )
  })
})

describe('determinism', () => {
  async function record(seed: number) {
    const { events, send, simulation } = setup({
      random: createRandom(seed),
      timing: {
        ...TIMING,
        presenceEveryMs: { min: 500, max: 1500 },
        incomingEveryMs: { min: 700, max: 2000 },
      },
    })
    simulation.start()
    await send()
    await vi.advanceTimersByTimeAsync(30_000)
    simulation.stop()
    return JSON.stringify(events)
  }

  it('produces the same events from the same seed', async () => {
    const first = await record(42)
    vi.setSystemTime(new Date('2026-11-05T12:00:00.000Z'))
    const second = await record(42)

    expect(second).toBe(first)
  })

  it('produces different events from a different seed', async () => {
    const first = await record(1)
    vi.setSystemTime(new Date('2026-11-05T12:00:00.000Z'))
    const second = await record(2)

    expect(second).not.toBe(first)
  })
})

describe('cleanup', () => {
  it('clears every timer when stopped', async () => {
    const { send, simulation } = setup()
    simulation.start()
    await send()
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    simulation.stop()

    expect(vi.getTimerCount()).toBe(0)
  })

  it('produces nothing after stopping, and ignores new messages', async () => {
    const { events, send, simulation } = setup()
    simulation.start()
    await send()
    simulation.stop()
    const before = events.length

    await send()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(events).toHaveLength(before)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ends typing in progress when stopped', async () => {
    const { events, send, simulation } = setup()
    simulation.start()
    await send()
    await vi.advanceTimersByTimeAsync(600)
    expect(events.at(-1)?.type).toBe('typing-started')

    simulation.stop()

    expect(events.at(-1)).toEqual({
      type: 'typing-stopped',
      conversationId: rohan,
      userId: rohanId,
    })
  })

  it('does not double up when started twice', async () => {
    const { events, send, simulation } = setup()
    simulation.start()
    simulation.start()
    expect(vi.getTimerCount()).toBe(2)

    const message = await send()
    await vi.advanceTimersByTimeAsync(300)

    expect(statusesOf(events, message.id)).toEqual(['delivered', 'read'])
  })

  it('works again after a restart', async () => {
    const { events, send, simulation } = setup()
    simulation.start()
    simulation.stop()
    simulation.start()

    const message = await send()
    await vi.advanceTimersByTimeAsync(300)

    expect(statusesOf(events, message.id)).toEqual(['delivered', 'read'])
  })
})

describe('createSimulatedChatApi', () => {
  const create = () =>
    createSimulatedChatApi({
      latencyMs: { min: 0, max: 0 },
      simulation: { random: createRandom(1), timing: TIMING },
    })

  it('runs only while someone is subscribed', () => {
    const api = create()
    expect(vi.getTimerCount()).toBe(0)

    const unsubscribe = api.subscribe(() => undefined)
    expect(vi.getTimerCount()).toBe(2)

    unsubscribe()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps running until the last subscriber leaves', () => {
    const api = create()
    const first = api.subscribe(() => undefined)
    const second = api.subscribe(() => undefined)

    first()
    expect(vi.getTimerCount()).toBe(2)

    second()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('treats a repeated unsubscribe as harmless', () => {
    const api = create()
    const first = api.subscribe(() => undefined)
    const second = api.subscribe(() => undefined)

    first()
    first()

    expect(vi.getTimerCount()).toBe(2)
    second()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('survives repeated mounting without leaking', () => {
    const api = create()

    for (let index = 0; index < 100; index += 1) {
      api.subscribe(() => undefined)()
    }

    expect(vi.getTimerCount()).toBe(0)
  })

  it('still reports typing stopped to the last listener', async () => {
    const api = create()
    const events: ChatEvent[] = []
    const unsubscribe = api.subscribe((event) => events.push(event))
    const sending = api.sendMessage({ conversationId: rohan, text: 'Hello' })
    await vi.advanceTimersByTimeAsync(0)
    await sending
    await vi.advanceTimersByTimeAsync(600)

    unsubscribe()

    expect(events.at(-1)?.type).toBe('typing-stopped')
  })

  it('leaves the message IDs of sent and received messages distinct', async () => {
    const api = create()
    const events: ChatEvent[] = []
    api.subscribe((event) => events.push(event))
    const sending = api.sendMessage({ conversationId: rohan, text: 'Hello' })
    await vi.advanceTimersByTimeAsync(0)
    const sent = await sending
    await vi.advanceTimersByTimeAsync(1000)
    const received = events.find((event) => event.type === 'message-received')

    expect(received?.type === 'message-received' && received.message.id).not.toBe(sent.id)
  })
})
