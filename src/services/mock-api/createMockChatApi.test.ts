import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, isApiError } from '@/services/apiError'
import type { ChatApi } from '@/services/chatApi'
import { toConversationId, toMessageId, toUserId } from '@/types/ids'
import { createMockChatApi, type MockChatApiOptions } from './createMockChatApi'
import { createMockSeed } from './seed'

const NOW = new Date('2026-11-05T12:00:00.000Z')

const maya = toUserId('user-maya')
const rohan = toUserId('user-rohan')
const vikram = toUserId('user-vikram')
const sara = toUserId('user-sara')
const neha = toUserId('user-neha')
const ananya = toUserId('user-ananya')

const direct = toConversationId('conversation-rohan')
const empty = toConversationId('conversation-vikram')
const ownedGroup = toConversationId('conversation-launch')
const memberGroup = toConversationId('conversation-trek')

const ownMessage = toMessageId('message-rohan-4')
const othersMessage = toMessageId('message-rohan-1')
const deletedMessage = toMessageId('message-trek-6')

function createApi(options: MockChatApiOptions = {}) {
  return createMockChatApi({ now: () => NOW, latencyMs: { min: 0, max: 0 }, ...options })
}

async function failure(promise: Promise<unknown>) {
  const error: unknown = await promise.then(
    () => {
      throw new Error('Expected the request to fail')
    },
    (reason: unknown) => reason,
  )

  if (!isApiError(error)) {
    throw error
  }

  return error
}

describe('reading', () => {
  it('returns the current user and everyone else', async () => {
    const api = createApi()

    expect((await api.getCurrentUser()).id).toBe(maya)
    expect((await api.getUsers()).map(({ id }) => id)).toContain(rohan)
    expect(await api.getPresence()).toContainEqual(
      expect.objectContaining({ userId: rohan, status: 'online' }),
    )
  })

  it('returns direct and group conversations together, newest first', async () => {
    const { conversations } = await createApi().getConversations()
    const times = conversations.map(({ updatedAt }) => updatedAt)

    expect(new Set(conversations.map(({ type }) => type))).toEqual(new Set(['direct', 'group']))
    expect(times).toEqual(times.toSorted().reverse())
  })

  it('includes what the sidebar needs in one response', async () => {
    const { conversations, lastMessages, participants } = await createApi().getConversations()
    const withMessages = conversations.filter(({ lastMessageId }) => lastMessageId)

    expect(lastMessages.map(({ id }) => id)).toEqual(withMessages.map((c) => c.lastMessageId))
    expect(new Set(participants.map((item) => item.conversationId))).toEqual(
      new Set(conversations.map(({ id }) => id)),
    )
  })

  it('returns messages oldest first, for either conversation type', async () => {
    const api = createApi()

    for (const conversationId of [direct, ownedGroup]) {
      const { messages } = await api.getMessages(conversationId)
      const times = messages.map(({ createdAt }) => createdAt)

      expect(messages.length).toBeGreaterThan(0)
      expect(times).toEqual(times.toSorted())
    }
  })

  it('returns an empty page for a conversation with no messages', async () => {
    await expect(createApi().getMessages(empty)).resolves.toEqual({ messages: [], hasMore: false })
  })

  it('pages backwards through a long conversation without gaps', async () => {
    const api = createApi()
    const all = (await api.getMessages(ownedGroup, { limit: 1000 })).messages
    const newest = await api.getMessages(ownedGroup, { limit: 20 })
    const firstId = newest.messages[0]?.id

    expect(firstId).toBeDefined()
    expect(newest.hasMore).toBe(true)

    const older = await api.getMessages(ownedGroup, {
      limit: 20,
      ...(firstId ? { before: firstId } : {}),
    })

    expect(older.hasMore).toBe(false)
    expect([...older.messages, ...newest.messages]).toEqual(all)
  })

  it('has more than one default page in the long sample conversation', async () => {
    await expect(createApi().getMessages(ownedGroup)).resolves.toMatchObject({ hasMore: true })
  })

  it('rejects an invalid page request', async () => {
    const api = createApi()

    expect((await failure(api.getMessages(direct, { limit: 0 }))).code).toBe('validation')
    expect(
      (await failure(api.getMessages(direct, { before: toMessageId('message-missing') }))).code,
    ).toBe('not-found')
  })

  it('reports an unknown conversation as not found', async () => {
    const error = await failure(createApi().getMessages(toConversationId('conversation-missing')))

    expect(error.code).toBe('not-found')
  })
})

describe('sending', () => {
  it.each([
    ['direct', direct],
    ['group', ownedGroup],
  ])('sends to a %s conversation through the same method', async (_type, conversationId) => {
    const api = createApi()

    const message = await api.sendMessage({ conversationId, text: '  On my way  ' })

    expect(message).toMatchObject({
      conversationId,
      senderId: maya,
      text: 'On my way',
      state: 'active',
      deliveryStatus: 'sent',
      createdAt: NOW.toISOString(),
      replyToMessageId: null,
    })
    expect((await api.getMessages(conversationId)).messages.at(-1)).toEqual(message)
  })

  it('moves the conversation to the top with the new preview', async () => {
    const api = createApi()

    const message = await api.sendMessage({ conversationId: memberGroup, text: 'Jacket packed' })
    const { conversations, lastMessages } = await api.getConversations()

    expect(conversations[0]).toMatchObject({ id: memberGroup, lastMessageId: message.id })
    expect(lastMessages).toContainEqual(message)
  })

  it('gives every message its own ID', async () => {
    const api = createApi()

    const first = await api.sendMessage({ conversationId: direct, text: 'One' })
    const second = await api.sendMessage({ conversationId: direct, text: 'Two' })

    expect(first.id).not.toBe(second.id)
  })

  it('stores a reply as a reference to its parent', async () => {
    const message = await createApi().sendMessage({
      conversationId: direct,
      text: 'Yes please',
      replyToMessageId: othersMessage,
    })

    expect(message.replyToMessageId).toBe(othersMessage)
  })

  it('rejects a reply to another conversation', async () => {
    const error = await failure(
      createApi().sendMessage({
        conversationId: ownedGroup,
        text: 'Wrong place',
        replyToMessageId: othersMessage,
      }),
    )

    expect(error.code).toBe('validation')
  })

  it('rejects an empty message', async () => {
    const error = await failure(createApi().sendMessage({ conversationId: direct, text: '   ' }))

    expect(error.code).toBe('validation')
  })
})

describe('editing', () => {
  it('updates the text and records when', async () => {
    const api = createApi()

    const edited = await api.editMessage({ messageId: ownMessage, text: 'Deal. 5k!' })

    expect(edited).toMatchObject({ text: 'Deal. 5k!', editedAt: NOW.toISOString() })
    expect((await api.getMessages(direct)).messages).toContainEqual(edited)
  })

  it("rejects editing someone else's message", async () => {
    const error = await failure(createApi().editMessage({ messageId: othersMessage, text: 'No' }))

    expect(error.code).toBe('forbidden')
  })

  it('rejects editing a deleted message', async () => {
    const error = await failure(createApi().editMessage({ messageId: deletedMessage, text: 'No' }))

    expect(error.code).toBe('conflict')
  })

  it('rejects empty text', async () => {
    const error = await failure(createApi().editMessage({ messageId: ownMessage, text: '' }))

    expect(error.code).toBe('validation')
  })
})

describe('deleting', () => {
  it('removes the content but keeps the message in place', async () => {
    const api = createApi()

    const deleted = await api.deleteMessage(ownMessage)
    const stored = (await api.getMessages(direct)).messages.find(({ id }) => id === ownMessage)

    expect(deleted).toMatchObject({ state: 'deleted', deletedAt: NOW.toISOString() })
    expect(deleted).not.toHaveProperty('text')
    expect(deleted).not.toHaveProperty('reactions')
    expect(stored).toEqual(deleted)
  })

  it('leaves replies pointing at the deleted message', async () => {
    const api = createApi()
    const reply = await api.sendMessage({
      conversationId: direct,
      text: 'Reply',
      replyToMessageId: ownMessage,
    })

    await api.deleteMessage(ownMessage)

    expect((await api.getMessages(direct)).messages).toContainEqual(reply)
  })

  it('succeeds when repeated, so a retry is safe', async () => {
    const api = createApi()

    const first = await api.deleteMessage(ownMessage)

    await expect(api.deleteMessage(ownMessage)).resolves.toEqual(first)
  })

  it("rejects deleting someone else's message", async () => {
    expect((await failure(createApi().deleteMessage(othersMessage))).code).toBe('forbidden')
  })

  it('reports an unknown message as not found', async () => {
    const error = await failure(createApi().deleteMessage(toMessageId('message-missing')))

    expect(error.code).toBe('not-found')
  })
})

describe('reactions', () => {
  it('adds a reaction once, even when repeated', async () => {
    const api = createApi()
    const request = { messageId: othersMessage, emoji: '🔥' }

    await api.addReaction(request)
    const message = await api.addReaction(request)

    expect(message.reactions).toEqual([{ emoji: '🔥', userId: maya, reactedAt: NOW.toISOString() }])
  })

  it("removes only the current user's reaction", async () => {
    const api = createApi()
    const liked = toMessageId('message-priya-4')

    await api.addReaction({ messageId: liked, emoji: '❤️' })
    const message = await api.removeReaction({ messageId: liked, emoji: '❤️' })

    expect(message.reactions.map(({ userId }) => userId)).toEqual([toUserId('user-priya')])
  })

  it('rejects reacting to a deleted message', async () => {
    const error = await failure(createApi().addReaction({ messageId: deletedMessage, emoji: '👍' }))

    expect(error.code).toBe('conflict')
  })
})

describe('marking as read', () => {
  it('clears unread and moves the read position to the newest message', async () => {
    const api = createApi()

    const { conversation, participant } = await api.markConversationRead(direct)

    expect(conversation.unread).toEqual({ count: 0, firstUnreadMessageId: null })
    expect(participant.lastReadMessageId).toBe(toMessageId('message-rohan-6'))

    const { conversations } = await api.getConversations()
    expect(conversations.find(({ id }) => id === direct)?.unread.count).toBe(0)
  })
})

describe('group members', () => {
  it('adds members to both the conversation and the participant records', async () => {
    const api = createApi()

    const { conversation, participants } = await api.addGroupMembers({
      conversationId: ownedGroup,
      userIds: [sara, vikram],
    })

    expect(conversation.participantIds).toEqual(expect.arrayContaining([sara, vikram]))
    expect(participants.map(({ userId }) => userId)).toEqual([...conversation.participantIds])
    expect(participants.at(-1)).toMatchObject({
      role: 'member',
      joinedAt: NOW.toISOString(),
      lastReadMessageId: null,
    })
  })

  it('adds someone once when they are listed twice', async () => {
    const { conversation } = await createApi().addGroupMembers({
      conversationId: ownedGroup,
      userIds: [sara, sara],
    })

    expect(conversation.participantIds.filter((id) => id === sara)).toHaveLength(1)
  })

  it('removes a member and keeps their messages', async () => {
    const api = createApi()
    const before = (await api.getMessages(ownedGroup, { limit: 1000 })).messages

    const { conversation, participants } = await api.removeGroupMember({
      conversationId: ownedGroup,
      userId: ananya,
    })

    expect(conversation.participantIds).not.toContain(ananya)
    expect(participants.map(({ userId }) => userId)).not.toContain(ananya)
    expect((await api.getMessages(ownedGroup, { limit: 1000 })).messages).toEqual(before)
  })

  it('lets a member leave, after which the group disappears for them', async () => {
    const api = createApi()

    await api.removeGroupMember({ conversationId: memberGroup, userId: maya })
    const { conversations } = await api.getConversations()

    expect(conversations.map(({ id }) => id)).not.toContain(memberGroup)
    expect((await failure(api.getMessages(memberGroup))).code).toBe('not-found')
  })

  it.each([
    ['add', (api: ChatApi) => api.addGroupMembers({ conversationId: direct, userIds: [sara] })],
    ['remove', (api: ChatApi) => api.removeGroupMember({ conversationId: direct, userId: rohan })],
  ])('rejects %s on a direct conversation', async (_action, act) => {
    expect((await failure(act(createApi()))).code).toBe('validation')
  })

  it('stops a regular member from managing others', async () => {
    const api = createApi()

    const adding = await failure(
      api.addGroupMembers({ conversationId: memberGroup, userIds: [vikram] }),
    )
    const removing = await failure(
      api.removeGroupMember({ conversationId: memberGroup, userId: neha }),
    )

    expect(adding.code).toBe('forbidden')
    expect(removing.code).toBe('forbidden')
  })

  it('keeps a group from losing its only owner', async () => {
    const api = createApi()

    const leaving = await failure(
      api.removeGroupMember({ conversationId: ownedGroup, userId: maya }),
    )

    expect(leaving.code).toBe('conflict')
  })

  it('stops an admin from removing the owner', async () => {
    const seed = createMockSeed(NOW)
    const api = createApi({
      seed: {
        ...seed,
        participants: seed.participants.map((participant) =>
          participant.conversationId === memberGroup && participant.userId === maya
            ? { ...participant, role: 'admin' }
            : participant,
        ),
      },
    })

    const error = await failure(
      api.removeGroupMember({ conversationId: memberGroup, userId: sara }),
    )

    expect(error.code).toBe('forbidden')
    await expect(
      api.removeGroupMember({ conversationId: memberGroup, userId: neha }),
    ).resolves.toBeDefined()
  })

  it('rejects adding an existing member, an unknown user, or nobody', async () => {
    const api = createApi()
    const add = (userIds: readonly ReturnType<typeof toUserId>[]) =>
      api.addGroupMembers({ conversationId: ownedGroup, userIds })

    expect((await failure(add([ananya]))).code).toBe('conflict')
    expect((await failure(add([toUserId('user-missing')]))).code).toBe('not-found')
    expect((await failure(add([]))).code).toBe('validation')
  })

  it('rejects removing someone who is not in the group', async () => {
    const error = await failure(
      createApi().removeGroupMember({ conversationId: ownedGroup, userId: vikram }),
    )

    expect(error.code).toBe('not-found')
  })
})

describe('simulated network', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stays pending until the delay passes', async () => {
    const api = createMockChatApi({ now: () => NOW, latencyMs: { min: 500, max: 500 } })
    let settled = false

    const pending = api.getUsers().then(() => {
      settled = true
    })

    await vi.advanceTimersByTimeAsync(499)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await pending
    expect(settled).toBe(true)
  })

  it('picks a delay inside the range', async () => {
    const api = createMockChatApi({
      now: () => NOW,
      latencyMs: { min: 100, max: 300 },
      random: () => 0.5,
    })
    let settled = false

    const pending = api.getUsers().then(() => {
      settled = true
    })

    await vi.advanceTimersByTimeAsync(199)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await pending
    expect(settled).toBe(true)
  })

  it('cancels a request and clears its timer', async () => {
    const api = createMockChatApi({ now: () => NOW, latencyMs: { min: 500, max: 500 } })
    const controller = new AbortController()

    const pending = failure(api.getConversations({ signal: controller.signal }))
    expect(vi.getTimerCount()).toBe(1)

    controller.abort()

    expect((await pending).code).toBe('aborted')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects at once if already cancelled', async () => {
    const controller = new AbortController()
    controller.abort()

    const error = await failure(createApi().getUsers({ signal: controller.signal }))

    expect(error.code).toBe('aborted')
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('simulated failures', () => {
  it('fails the next request, then recovers', async () => {
    const api = createApi()
    api.failNextRequest()

    const error = await failure(api.getConversations())

    expect(error.code).toBe('network')
    expect(error.retryable).toBe(true)
    await expect(api.getConversations()).resolves.toBeDefined()
  })

  it('can fail with a chosen error', async () => {
    const api = createApi()
    api.failNextRequest(new ApiError('forbidden', 'Not allowed'))

    const error = await failure(api.getUsers())

    expect(error.message).toBe('Not allowed')
    expect(error.retryable).toBe(false)
  })

  it('fails when the random roll falls under the failure rate', async () => {
    const unlucky = createApi({ failureRate: 0.5, random: () => 0.49 })
    const lucky = createApi({ failureRate: 0.5, random: () => 0.5 })

    expect((await failure(unlucky.getUsers())).code).toBe('network')
    await expect(lucky.getUsers()).resolves.toBeDefined()
  })

  it('never fails at the default rate', async () => {
    await expect(createApi({ random: () => 0 }).getUsers()).resolves.toBeDefined()
  })

  it('leaves data unchanged when a write fails', async () => {
    const api = createApi()
    const before = await api.getMessages(direct)

    api.failNextRequest()
    await failure(api.sendMessage({ conversationId: direct, text: 'Lost' }))

    await expect(api.getMessages(direct)).resolves.toEqual(before)
  })
})

describe('isolation', () => {
  it('keeps each instance separate', async () => {
    const first = createApi()
    const second = createApi()

    await first.sendMessage({ conversationId: direct, text: 'Only here' })

    const texts = (await second.getMessages(direct)).messages.map((message) =>
      message.state === 'active' ? message.text : null,
    )
    expect(texts).not.toContain('Only here')
  })

  it('is unaffected when a caller changes a response', async () => {
    const api = createApi()
    const before = structuredClone(await api.getMessages(direct))

    const response = await api.getMessages(direct)
    Object.assign(response.messages[0] ?? {}, { text: 'Changed by the caller' })

    await expect(api.getMessages(direct)).resolves.toEqual(before)
  })
})
