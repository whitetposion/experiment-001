import { ApiError } from '@/services/apiError'
import type { ChatApi, GroupMembersResponse, RequestOptions } from '@/services/chatApi'
import type { Conversation, ConversationParticipant, GroupConversation } from '@/types/conversation'
import { toMessageId, type ConversationId, type MessageId, type UserId } from '@/types/ids'
import type { ActiveMessage, DeletedMessage, Message } from '@/types/message'
import { delay } from './delay'
import { createMockSeed, type MockSeed } from './seed'

const DEFAULT_PAGE_SIZE = 30

export interface MockChatApiOptions {
  /** Starting data. Defaults to the sample conversations. */
  seed?: MockSeed
  /** The clock, replaceable so tests are repeatable. */
  now?: () => Date
  /** Each request waits a random time in this range. */
  latencyMs?: { min: number; max: number }
  /** The chance from 0 to 1 that any request fails with a network error. */
  failureRate?: number
  /** Returns a number from 0 up to 1, replaceable so tests are repeatable. */
  random?: () => number
}

export interface MockChatApi extends ChatApi {
  /** Makes the next request fail. Call it several times to fail several requests. */
  failNextRequest(error?: ApiError): void
}

function networkError() {
  return new ApiError('network', 'Could not reach the server. Check your connection and try again.')
}

function requireText(text: string) {
  const trimmed = text.trim()

  if (!trimmed) {
    throw new ApiError('validation', 'Type a message before sending.')
  }

  return trimmed
}

/** Creates an independent backend. Each instance keeps its own in-memory data. */
export function createMockChatApi({
  now = () => new Date(),
  seed = createMockSeed(now()),
  latencyMs = { min: 200, max: 700 },
  failureRate = 0,
  random = Math.random,
}: MockChatApiOptions = {}): MockChatApi {
  const { currentUserId } = seed
  const users = new Map(seed.users.map((user) => [user.id, user]))
  const presence = [...seed.presence]
  const conversations = new Map(seed.conversations.map((item) => [item.id, item]))
  const messages = new Map(seed.messages.map((item) => [item.id, item]))
  let participants = [...seed.participants]
  let nextMessageNumber = 1
  const queuedFailures: ApiError[] = []

  /** Every call passes through here, so all of them get latency, failures and isolation. */
  async function request<Result>(handler: () => Result, options?: RequestOptions) {
    const { min, max } = latencyMs
    await delay(min + random() * (max - min), options?.signal)

    const queuedFailure = queuedFailures.shift()

    if (queuedFailure) {
      throw queuedFailure
    }

    if (random() < failureRate) {
      throw networkError()
    }

    // Callers get a copy, as they would across a network, so they cannot change this data.
    return structuredClone(handler())
  }

  function participantsOf(conversationId: ConversationId) {
    return participants.filter((item) => item.conversationId === conversationId)
  }

  function membership(conversationId: ConversationId, userId: UserId) {
    return participantsOf(conversationId).find((item) => item.userId === userId)
  }

  /** Reports a conversation the user cannot see as missing, which also hides that it exists. */
  function findConversation(conversationId: ConversationId): Conversation {
    const conversation = conversations.get(conversationId)

    if (!conversation || !membership(conversationId, currentUserId)) {
      throw new ApiError('not-found', 'This conversation is no longer available.')
    }

    return conversation
  }

  function findGroup(conversationId: ConversationId): GroupConversation {
    const conversation = findConversation(conversationId)

    if (conversation.type !== 'group') {
      throw new ApiError(
        'validation',
        'Only group conversations can have members added or removed.',
      )
    }

    return conversation
  }

  function findMessage(messageId: MessageId): Message {
    const message = messages.get(messageId)

    if (!message) {
      throw new ApiError('not-found', 'This message is no longer available.')
    }

    findConversation(message.conversationId)
    return message
  }

  function findOwnMessage(messageId: MessageId, action: string): Message {
    const message = findMessage(messageId)

    if (message.senderId !== currentUserId) {
      throw new ApiError('forbidden', `You can only ${action} your own messages.`)
    }

    return message
  }

  function messagesOf(conversationId: ConversationId) {
    return [...messages.values()]
      .filter((message) => message.conversationId === conversationId)
      .sort((first, second) => first.createdAt.localeCompare(second.createdAt))
  }

  function findActiveMessage(messageId: MessageId): ActiveMessage {
    const message = findMessage(messageId)

    if (message.state === 'deleted') {
      throw new ApiError('conflict', 'This message was deleted.')
    }

    return message
  }

  function canManageMembers(conversationId: ConversationId) {
    const role = membership(conversationId, currentUserId)?.role
    return role === 'owner' || role === 'admin'
  }

  function saveGroup(
    group: GroupConversation,
    participantIds: readonly UserId[],
  ): GroupMembersResponse {
    const conversation = { ...group, participantIds, updatedAt: now().toISOString() }
    conversations.set(group.id, conversation)
    return { conversation, participants: participantsOf(group.id) }
  }

  return {
    failNextRequest(error = networkError()) {
      queuedFailures.push(error)
    },

    getCurrentUser: (options) =>
      request(() => {
        const user = users.get(currentUserId)

        if (!user) {
          throw new ApiError('not-found', 'Your account could not be found.')
        }

        return user
      }, options),

    getUsers: (options) => request(() => [...users.values()], options),

    getPresence: (options) => request(() => presence, options),

    getConversations: (options) =>
      request(() => {
        const visible = [...conversations.values()]
          .filter(({ id }) => membership(id, currentUserId))
          .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))

        return {
          conversations: visible,
          participants: visible.flatMap(({ id }) => participantsOf(id)),
          lastMessages: visible.flatMap(({ lastMessageId }) => {
            const message = lastMessageId ? messages.get(lastMessageId) : undefined
            return message ? [message] : []
          }),
        }
      }, options),

    getMessages: (conversationId, options = {}) =>
      request(() => {
        const { before, limit = DEFAULT_PAGE_SIZE } = options

        if (!Number.isInteger(limit) || limit < 1) {
          throw new ApiError('validation', 'The page size must be a positive whole number.')
        }

        findConversation(conversationId)
        const all = messagesOf(conversationId)
        const end = before ? all.findIndex(({ id }) => id === before) : all.length

        if (end === -1) {
          throw new ApiError('not-found', 'This message is no longer available.')
        }

        const start = Math.max(0, end - limit)
        return { messages: all.slice(start, end), hasMore: start > 0 }
      }, options),

    sendMessage: ({ conversationId, replyToMessageId, text }) =>
      request(() => {
        const conversation = findConversation(conversationId)
        const trimmed = requireText(text)

        if (
          replyToMessageId !== undefined &&
          findMessage(replyToMessageId).conversationId !== conversationId
        ) {
          throw new ApiError('validation', 'You can only reply to a message in this conversation.')
        }

        const createdAt = now().toISOString()
        const message: ActiveMessage = {
          id: toMessageId(`message-sent-${String(nextMessageNumber)}`),
          conversationId,
          senderId: currentUserId,
          createdAt,
          replyToMessageId: replyToMessageId ?? null,
          deliveryStatus: 'sent',
          state: 'active',
          text: trimmed,
          editedAt: null,
          reactions: [],
          attachments: [],
        }

        nextMessageNumber += 1
        messages.set(message.id, message)
        conversations.set(conversationId, {
          ...conversation,
          lastMessageId: message.id,
          updatedAt: createdAt,
        })

        return message
      }),

    editMessage: ({ messageId, text }) =>
      request(() => {
        const message = findOwnMessage(messageId, 'edit')

        if (message.state === 'deleted') {
          throw new ApiError('conflict', 'This message was deleted, so it can no longer be edited.')
        }

        const edited: ActiveMessage = {
          ...message,
          text: requireText(text),
          editedAt: now().toISOString(),
        }

        messages.set(messageId, edited)
        return edited
      }),

    deleteMessage: (messageId) =>
      request(() => {
        const message = findOwnMessage(messageId, 'delete')

        // Deleting twice succeeds, so retrying after a lost response is safe.
        if (message.state === 'deleted') {
          return message
        }

        const deleted: DeletedMessage = {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          createdAt: message.createdAt,
          replyToMessageId: message.replyToMessageId,
          deliveryStatus: message.deliveryStatus,
          state: 'deleted',
          deletedAt: now().toISOString(),
        }

        messages.set(messageId, deleted)
        return deleted
      }),

    addReaction: ({ emoji, messageId }) =>
      request(() => {
        const message = findActiveMessage(messageId)
        const exists = message.reactions.some(
          (reaction) => reaction.emoji === emoji && reaction.userId === currentUserId,
        )

        // Adding twice succeeds, so retrying after a lost response is safe.
        if (exists) {
          return message
        }

        const updated: ActiveMessage = {
          ...message,
          reactions: [
            ...message.reactions,
            { emoji, userId: currentUserId, reactedAt: now().toISOString() },
          ],
        }

        messages.set(messageId, updated)
        return updated
      }),

    removeReaction: ({ emoji, messageId }) =>
      request(() => {
        const message = findActiveMessage(messageId)
        const updated: ActiveMessage = {
          ...message,
          reactions: message.reactions.filter(
            (reaction) => reaction.emoji !== emoji || reaction.userId !== currentUserId,
          ),
        }

        messages.set(messageId, updated)
        return updated
      }),

    markConversationRead: (conversationId) =>
      request(() => {
        const conversation = findConversation(conversationId)
        const participant = membership(conversationId, currentUserId)

        if (!participant) {
          throw new ApiError('not-found', 'This conversation is no longer available.')
        }

        const updatedConversation: Conversation = {
          ...conversation,
          unread: { count: 0, firstUnreadMessageId: null },
        }
        const updatedParticipant: ConversationParticipant = {
          ...participant,
          lastReadMessageId: messagesOf(conversationId).at(-1)?.id ?? null,
        }

        conversations.set(conversationId, updatedConversation)
        participants = participants.map((item) =>
          item === participant ? updatedParticipant : item,
        )

        return { conversation: updatedConversation, participant: updatedParticipant }
      }),

    addGroupMembers: ({ conversationId, userIds }) =>
      request(() => {
        const group = findGroup(conversationId)

        if (!canManageMembers(conversationId)) {
          throw new ApiError('forbidden', 'Only group admins can add members.')
        }

        if (userIds.length === 0) {
          throw new ApiError('validation', 'Choose at least one person to add.')
        }

        for (const userId of userIds) {
          if (!users.has(userId)) {
            throw new ApiError('not-found', 'One of these people could not be found.')
          }

          if (membership(conversationId, userId)) {
            throw new ApiError('conflict', 'One of these people is already in the group.')
          }
        }

        const joinedAt = now().toISOString()
        const added = [...new Set(userIds)].map((userId): ConversationParticipant => ({
          conversationId,
          userId,
          role: 'member',
          joinedAt,
          lastReadMessageId: null,
        }))

        participants = [...participants, ...added]
        return saveGroup(group, [...group.participantIds, ...added.map(({ userId }) => userId)])
      }),

    removeGroupMember: ({ conversationId, userId }) =>
      request(() => {
        const group = findGroup(conversationId)
        const member = membership(conversationId, userId)

        if (!member) {
          throw new ApiError('not-found', 'This person is not in the group.')
        }

        const isLeaving = userId === currentUserId

        if (!isLeaving && !canManageMembers(conversationId)) {
          throw new ApiError('forbidden', 'Only group admins can remove members.')
        }

        if (member.role === 'owner') {
          const ownerCount = participantsOf(conversationId).filter(
            ({ role }) => role === 'owner',
          ).length

          if (!isLeaving) {
            throw new ApiError('forbidden', 'The group owner cannot be removed.')
          }

          if (ownerCount === 1) {
            throw new ApiError('conflict', 'Make someone else the owner before leaving the group.')
          }
        }

        participants = participants.filter((item) => item !== member)
        return saveGroup(
          group,
          group.participantIds.filter((id) => id !== userId),
        )
      }),
  }
}
