import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  CONVERSATION_FILTERS,
  type Conversation,
  type ConversationFilter,
  type DirectConversation,
  type GroupConversation,
} from './conversation'
import { toConversationId, toMessageId, toUserId, type ConversationId, type UserId } from './ids'
import type { ActiveMessage, DeletedMessage, Message } from './message'

// These tests run in the type checker. Every @ts-expect-error fails `npm run typecheck`
// if the line below it stops being an error.
function accept<Value>(value: Value) {
  return value
}

const asha = toUserId('user-asha')
const ravi = toUserId('user-ravi')
const timestamp = '2026-11-05T09:54:00.000Z'

const conversationBase = {
  id: toConversationId('conversation-1'),
  creatorId: asha,
  createdAt: timestamp,
  updatedAt: timestamp,
  lastMessageId: null,
  unread: { count: 0, firstUnreadMessageId: null },
}

const direct: DirectConversation = {
  ...conversationBase,
  type: 'direct',
  participantIds: [asha, ravi],
}

const group: GroupConversation = {
  ...conversationBase,
  type: 'group',
  participantIds: [asha, ravi, toUserId('user-mei')],
  name: 'Design team',
  description: null,
  avatarUrl: null,
}

const messageBase = {
  id: toMessageId('message-1'),
  conversationId: conversationBase.id,
  senderId: asha,
  createdAt: timestamp,
  replyToMessageId: null,
  deliveryStatus: 'read',
} as const

const active: ActiveMessage = {
  ...messageBase,
  state: 'active',
  text: 'Hello',
  editedAt: null,
  reactions: [],
  attachments: [],
}

const deleted: DeletedMessage = { ...messageBase, state: 'deleted', deletedAt: timestamp }

function conversationTitle(conversation: Conversation) {
  return conversation.type === 'group' ? conversation.name : conversation.participantIds[1]
}

function messagePreview(message: Message) {
  return message.state === 'active' ? message.text : 'This message was deleted'
}

describe('conversation model', () => {
  it('stores direct and group conversations as one entity', () => {
    const conversations: Conversation[] = [direct, group]

    expect(conversations.map(conversationTitle)).toEqual([ravi, 'Design team'])
  })

  it('narrows a list to groups with a plain filter', () => {
    const groups = [direct, group].filter((conversation) => conversation.type === 'group')

    expectTypeOf(groups).toEqualTypeOf<GroupConversation[]>()
  })

  it('only allows group fields on groups', () => {
    // @ts-expect-error a direct conversation has no group name
    accept<DirectConversation>({ ...direct, name: 'Not allowed' })
    // @ts-expect-error a group must have a name
    accept<GroupConversation>({
      ...conversationBase,
      type: 'group',
      participantIds: [],
      description: null,
      avatarUrl: null,
    })
  })

  it('requires exactly two participants in a direct conversation', () => {
    // @ts-expect-error three participants make a group
    accept<DirectConversation>({ ...direct, participantIds: [asha, ravi, asha] })
    // @ts-expect-error one participant is not a conversation
    accept<DirectConversation>({ ...direct, participantIds: [asha] })
  })

  it('exposes the filters that the sidebar offers', () => {
    expect(CONVERSATION_FILTERS).toEqual(['all', 'unread', 'groups'])
    expectTypeOf<ConversationFilter>().toEqualTypeOf<'all' | 'unread' | 'groups'>()
  })
})

describe('message model', () => {
  it('previews active and deleted messages', () => {
    expect([active, deleted].map(messagePreview)).toEqual(['Hello', 'This message was deleted'])
  })

  it('cannot keep content on a deleted message', () => {
    // @ts-expect-error deleted messages have no text
    accept<DeletedMessage>({ ...deleted, text: 'Still here' })
  })

  it('rejects an unknown delivery status', () => {
    // @ts-expect-error seen is not a delivery status
    accept<ActiveMessage>({ ...active, deliveryStatus: 'seen' })
  })
})

describe('branded IDs', () => {
  it('are plain strings at runtime', () => {
    expect(toUserId('user-asha')).toBe('user-asha')
  })

  it('cannot be swapped', () => {
    // @ts-expect-error a conversation ID is not a user ID
    accept<UserId>(toConversationId('conversation-1'))
    // @ts-expect-error a raw string must go through a constructor
    accept<ConversationId>('conversation-1')
    // @ts-expect-error senderId takes a user ID
    accept<ActiveMessage>({ ...active, senderId: toConversationId('conversation-1') })
  })
})
