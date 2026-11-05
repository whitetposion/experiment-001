import type { ConversationId, IsoTimestamp, MessageId, UserId } from './ids'

export type ConversationType = 'direct' | 'group'

export type ParticipantRole = 'owner' | 'admin' | 'member'

/** The one rule for who manages members, shared so the UI and the backend always agree. */
export const canRoleManageMembers = (role: ParticipantRole | undefined) =>
  role === 'owner' || role === 'admin'

/** Unread state for the signed-in user. */
export interface ConversationUnread {
  readonly count: number
  /** Where the "new messages" divider and jump-to-unread start. */
  readonly firstUnreadMessageId: MessageId | null
}

interface ConversationBase {
  readonly id: ConversationId
  readonly creatorId: UserId
  readonly createdAt: IsoTimestamp
  readonly updatedAt: IsoTimestamp
  readonly lastMessageId: MessageId | null
  readonly unread: ConversationUnread
}

/** Has no name or avatar of its own. Those come from the other participant. */
export interface DirectConversation extends ConversationBase {
  readonly type: 'direct'
  readonly participantIds: readonly [UserId, UserId]
}

export interface GroupConversation extends ConversationBase {
  readonly type: 'group'
  readonly participantIds: readonly UserId[]
  readonly name: string
  readonly description: string | null
  readonly avatarUrl: string | null
}

export type Conversation = DirectConversation | GroupConversation

/** One user's membership of one conversation. Identified by conversationId and userId together. */
export interface ConversationParticipant {
  readonly conversationId: ConversationId
  readonly userId: UserId
  readonly role: ParticipantRole
  readonly joinedAt: IsoTimestamp
  /** Everything up to this message counts as read by this user. */
  readonly lastReadMessageId: MessageId | null
}

export const CONVERSATION_FILTERS = ['all', 'unread', 'groups'] as const

export type ConversationFilter = (typeof CONVERSATION_FILTERS)[number]
