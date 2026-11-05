import { describe, expect, it } from 'vitest'
import { createMockSeed } from './seed'

const seed = createMockSeed(new Date('2026-11-05T12:00:00.000Z'))
const messagesById = new Map(seed.messages.map((message) => [message.id, message]))
const userIds = new Set(seed.users.map(({ id }) => id))

describe('mock seed', () => {
  it('contains both conversation types, with the states the UI has to show', () => {
    const types = seed.conversations.map(({ type }) => type)
    const statuses = new Set(seed.messages.map(({ deliveryStatus }) => deliveryStatus))
    const active = seed.messages.filter((message) => message.state === 'active')

    expect(types).toContain('direct')
    expect(types).toContain('group')
    expect(statuses).toEqual(new Set(['read', 'delivered', 'failed']))
    expect(seed.messages.some(({ state }) => state === 'deleted')).toBe(true)
    expect(seed.messages.some(({ replyToMessageId }) => replyToMessageId)).toBe(true)
    expect(active.some(({ editedAt }) => editedAt)).toBe(true)
    expect(active.some(({ reactions }) => reactions.length > 0)).toBe(true)
    expect(seed.conversations.some(({ unread }) => unread.count > 0)).toBe(true)
    expect(seed.conversations.some(({ lastMessageId }) => !lastMessageId)).toBe(true)
    expect(new Set(seed.presence.map(({ status }) => status))).toEqual(
      new Set(['online', 'offline']),
    )
  })

  it('uses unique IDs', () => {
    for (const items of [seed.users, seed.conversations, seed.messages]) {
      expect(new Set(items.map(({ id }) => id)).size).toBe(items.length)
    }
  })

  it('gives every user a presence record', () => {
    expect(new Set(seed.presence.map(({ userId }) => userId))).toEqual(userIds)
  })

  it('stays in the past', () => {
    const now = '2026-11-05T12:00:00.000Z'

    expect(seed.messages.filter(({ createdAt }) => createdAt >= now)).toEqual([])
  })

  describe.each(seed.conversations.map((conversation) => [conversation.id, conversation] as const))(
    '%s',
    (conversationId, conversation) => {
      const messages = seed.messages.filter((item) => item.conversationId === conversationId)
      const participants = seed.participants.filter(
        (item) => item.conversationId === conversationId,
      )
      const memberIds = new Set<string>(conversation.participantIds)

      it('keeps participantIds and participant records in sync', () => {
        expect(new Set(participants.map(({ userId }) => userId))).toEqual(memberIds)
        expect(participants).toHaveLength(conversation.participantIds.length)
      })

      it('references only known users, and includes the current user', () => {
        expect(conversation.participantIds.every((id) => userIds.has(id))).toBe(true)
        expect(memberIds.has(seed.currentUserId)).toBe(true)
        expect(memberIds.has(conversation.creatorId)).toBe(true)
      })

      it('has a group owner where it needs one', () => {
        const owners = participants.filter(({ role }) => role === 'owner')

        expect(owners).toHaveLength(conversation.type === 'group' ? 1 : 0)
      })

      it('lists messages in time order, from members', () => {
        const times = messages.map(({ createdAt }) => createdAt)

        expect(times).toEqual(times.toSorted())
        expect(messages.every(({ senderId }) => memberIds.has(senderId))).toBe(true)
      })

      it('points lastMessageId at the newest message', () => {
        expect(conversation.lastMessageId).toBe(messages.at(-1)?.id ?? null)
      })

      it('has unread information that matches the messages', () => {
        const { count, firstUnreadMessageId } = conversation.unread
        const unread = messages.slice(messages.length - count)

        expect(firstUnreadMessageId).toBe(count > 0 ? unread[0]?.id : null)
        expect(unread.every(({ senderId }) => senderId !== seed.currentUserId)).toBe(true)
      })

      it('replies only to earlier messages in the same conversation', () => {
        for (const message of messages) {
          if (message.replyToMessageId) {
            const parent = messagesById.get(message.replyToMessageId)

            expect(parent?.conversationId).toBe(conversationId)
            expect(parent && parent.createdAt < message.createdAt).toBe(true)
          }
        }
      })

      it('has reactions from members, at most one per user', () => {
        for (const message of messages) {
          if (message.state === 'active') {
            const reactors = message.reactions.map(({ userId }) => userId)

            expect(new Set(reactors).size).toBe(reactors.length)
            expect(message.reactions.every(({ userId }) => memberIds.has(userId))).toBe(true)
          }
        }
      })
    },
  )

  it('stays relative to the moment it was created', () => {
    const later = createMockSeed(new Date('2030-01-01T00:00:00.000Z'))

    expect(later.messages[0]?.createdAt.startsWith('2029')).toBe(true)
  })
})
