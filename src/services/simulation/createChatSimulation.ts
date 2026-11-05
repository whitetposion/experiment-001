import { randomInRange, type NumberRange } from '@/lib/createRandom'
import type { MockBackend } from '@/services/mock-api/createMockChatApi'
import type { Conversation } from '@/types/conversation'
import {
  conversationMemberKey,
  type ConversationId,
  type MessageId,
  type UserId,
} from '@/types/ids'
import type { ActiveMessage } from '@/types/message'

export interface SimulationTiming {
  /** From a message being sent to it being delivered. */
  readonly deliveredAfterMs: NumberRange
  /** From delivered to read. */
  readonly readAfterMs: NumberRange
  /** From read to the other person starting to type. */
  readonly replyAfterMs: NumberRange
  readonly typingForMs: NumberRange
  /** The time between someone going online or offline. */
  readonly presenceEveryMs: NumberRange
  /** The time between messages that nobody prompted. */
  readonly incomingEveryMs: NumberRange
}

export const DEFAULT_TIMING: SimulationTiming = {
  deliveredAfterMs: { min: 150, max: 400 },
  readAfterMs: { min: 300, max: 800 },
  replyAfterMs: { min: 200, max: 600 },
  typingForMs: { min: 600, max: 1200 },
  presenceEveryMs: { min: 12_000, max: 30_000 },
  incomingEveryMs: { min: 20_000, max: 45_000 },
}

const REPLIES = [
  'Sounds good to me',
  'Give me a minute, I will check',
  'Yes, that works',
  'Good point, let me think about it',
  'Thanks for letting me know',
  'On it',
  'Can we talk about this tomorrow?',
  'Nice, I like that',
]

const UNPROMPTED_MESSAGES = [
  'Are you free for a quick call later?',
  'Just saw this, will reply properly soon',
  'Any update on this?',
  'Running a bit late today',
  'Have you got a minute?',
  'Sending the details over now',
]

/** How long an indicator lasts past its expected end, in case the stop event is lost. */
const TYPING_GRACE_MS = 3000

export interface ChatSimulationOptions {
  /** Returns a number from 0 up to 1. Pass createRandom(seed) for a repeatable run. */
  random?: () => number
  timing?: SimulationTiming
  /** The chance from 0 to 1 that someone in a group replies. */
  groupReplyChance?: number
}

export interface ChatSimulation {
  start(): void
  stop(): void
}

/**
 * Pretends to be everyone else in the app. It only talks to the mock backend, so it knows
 * nothing about React or Redux. Every timer goes through schedule, so stop clears them all.
 */
export function createChatSimulation(
  backend: MockBackend,
  {
    groupReplyChance = 0.5,
    random = Math.random,
    timing = DEFAULT_TIMING,
  }: ChatSimulationOptions = {},
): ChatSimulation {
  const { currentUserId } = backend
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const typing = new Map<string, { conversationId: ConversationId; userId: UserId }>()
  const deliveringIds = new Set<MessageId>()
  let stopListening: (() => void) | null = null

  const between = (range: NumberRange) => randomInRange(range, random)

  function pick<Item>(items: readonly Item[]): Item | undefined {
    return items[Math.floor(random() * items.length)]
  }

  function schedule(delayMs: number, task: () => void) {
    const timer = setTimeout(() => {
      timers.delete(timer)
      task()
    }, delayMs)

    timers.add(timer)
  }

  const othersIn = (conversation: Conversation) =>
    conversation.participantIds.filter((id) => id !== currentUserId)

  function typeThenSend(conversationId: ConversationId, userId: UserId, lines: readonly string[]) {
    const key = conversationMemberKey(conversationId, userId)
    const text = pick(lines)

    if (
      !text ||
      typing.has(key) ||
      !backend.isMember(conversationId, userId) ||
      !backend.isMember(conversationId, currentUserId)
    ) {
      return
    }

    const duration = between(timing.typingForMs)

    typing.set(key, { conversationId, userId })
    backend.startTyping(conversationId, userId, duration + TYPING_GRACE_MS)

    schedule(duration, () => {
      typing.delete(key)
      backend.stopTyping(conversationId, userId)
      backend.deliverMessage(conversationId, userId, text)
    })
  }

  function reply(conversation: Conversation) {
    const online = othersIn(conversation).filter((id) => backend.isOnline(id))
    const shouldReply = conversation.type === 'direct' || random() < groupReplyChance
    const responder = pick(online)

    if (responder && shouldReply) {
      schedule(between(timing.replyAfterMs), () => {
        typeThenSend(conversation.id, responder, REPLIES)
      })
    }
  }

  function deliverThenRead(messageId: MessageId, conversation: Conversation) {
    // A recipient can come back online while a message is already on its way to them.
    if (deliveringIds.has(messageId)) {
      return
    }

    deliveringIds.add(messageId)

    schedule(between(timing.deliveredAfterMs), () => {
      backend.changeDeliveryStatus(messageId, 'delivered')

      schedule(between(timing.readAfterMs), () => {
        backend.changeDeliveryStatus(messageId, 'read')
        deliveringIds.delete(messageId)
        reply(conversation)
      })
    })
  }

  function handleMessageSent({ conversationId, id }: ActiveMessage) {
    const conversation = backend.getConversations().find((item) => item.id === conversationId)

    if (!conversation) {
      return
    }

    // A direct message waits for its recipient to come online. In a group, somebody always
    // receives it, so it moves on. Real per-recipient tracking is out of scope for a mock.
    const recipient = othersIn(conversation)[0]
    const canDeliver =
      conversation.type === 'group' || (recipient !== undefined && backend.isOnline(recipient))

    if (canDeliver) {
      deliverThenRead(id, conversation)
    }
  }

  function deliverWaitingMessages(userId: UserId) {
    for (const conversation of backend.getConversations()) {
      if (conversation.type === 'direct' && othersIn(conversation).includes(userId)) {
        for (const messageId of backend.getOwnMessageIds(conversation.id, 'sent')) {
          deliverThenRead(messageId, conversation)
        }
      }
    }
  }

  function presenceTick() {
    const userId = pick(backend.getOtherUserIds())

    if (userId) {
      const comingOnline = !backend.isOnline(userId)

      backend.changePresence(userId, comingOnline ? 'online' : 'offline')

      if (comingOnline) {
        deliverWaitingMessages(userId)
      }
    }

    schedule(between(timing.presenceEveryMs), presenceTick)
  }

  function incomingTick() {
    const conversation = pick(backend.getConversations())
    const sender = conversation && pick(othersIn(conversation).filter((id) => backend.isOnline(id)))

    if (conversation && sender) {
      typeThenSend(conversation.id, sender, UNPROMPTED_MESSAGES)
    }

    schedule(between(timing.incomingEveryMs), incomingTick)
  }

  return {
    start() {
      if (stopListening) {
        return
      }

      stopListening = backend.onMessageSent(handleMessageSent)
      schedule(between(timing.presenceEveryMs), presenceTick)
      schedule(between(timing.incomingEveryMs), incomingTick)
    },

    stop() {
      stopListening?.()
      stopListening = null

      for (const timer of timers) {
        clearTimeout(timer)
      }
      timers.clear()
      deliveringIds.clear()

      // Nobody is left to finish typing, so nothing should stay on screen saying they are.
      for (const { conversationId, userId } of typing.values()) {
        backend.stopTyping(conversationId, userId)
      }
      typing.clear()
    },
  }
}
