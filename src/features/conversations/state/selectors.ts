import { shallowEqual } from 'react-redux'
import { createAppSelector, type RootState } from '@/app/hooks'
import { selectMessageById } from '@/features/messages'
import { selectCurrentUserId, selectIsUserOnline, selectUserEntities } from '@/features/presence'
import type { Conversation, ConversationFilter } from '@/types/conversation'
import type { ConversationId, UserId } from '@/types/ids'
import type { MessageDeliveryStatus } from '@/types/message'
import type { User } from '@/types/user'
import { conversationsAdapter, participantKey, participantsAdapter } from './slice'

const adapterSelectors = conversationsAdapter.getSelectors(
  (state: RootState) => state.conversations,
)
const participantSelectors = participantsAdapter.getSelectors(
  (state: RootState) => state.conversations.participants,
)

const UNKNOWN_CONTACT = 'Unknown contact'

export const selectConversationById = adapterSelectors.selectById
export const selectAllConversations = adapterSelectors.selectAll

export const selectConversationCount = adapterSelectors.selectTotal

export const selectSelectedConversationId = (state: RootState) =>
  state.conversations.selectedConversationId
export const selectConversationSearchQuery = (state: RootState) => state.conversations.searchQuery
export const selectConversationFilter = (state: RootState) => state.conversations.filter
export const selectConversationsStatus = (state: RootState) => state.conversations.status
export const selectConversationsError = (state: RootState) => state.conversations.error

export const selectSelectedConversation = (state: RootState) => {
  const conversationId = selectSelectedConversationId(state)
  return conversationId ? selectConversationById(state, conversationId) : undefined
}

function otherParticipantId(conversation: Conversation, currentUserId: UserId | null) {
  return conversation.participantIds.find((id) => id !== currentUserId)
}

function titleOf(
  conversation: Conversation,
  users: Readonly<Record<UserId, User | undefined>>,
  currentUserId: UserId | null,
) {
  if (conversation.type === 'group') {
    return conversation.name
  }

  const otherId = otherParticipantId(conversation, currentUserId)
  return (otherId && users[otherId]?.displayName) ?? UNKNOWN_CONTACT
}

/** A string, so a row re-renders only when the visible title changes. */
export const selectConversationTitle = (state: RootState, conversationId: ConversationId) => {
  const conversation = selectConversationById(state, conversationId)

  return conversation
    ? titleOf(conversation, selectUserEntities(state), selectCurrentUserId(state))
    : UNKNOWN_CONTACT
}

/** A group's own avatar, or the other person's in a direct conversation. */
export const selectConversationAvatarUrl = (state: RootState, conversationId: ConversationId) => {
  const conversation = selectConversationById(state, conversationId)

  if (conversation?.type !== 'direct') {
    return conversation?.avatarUrl ?? null
  }

  const otherId = otherParticipantId(conversation, selectCurrentUserId(state))
  return (otherId && selectUserEntities(state)[otherId]?.avatarUrl) ?? null
}

function matchesFilter(conversation: Conversation, filter: ConversationFilter) {
  switch (filter) {
    case 'all':
      return true
    case 'unread':
      return conversation.unread.count > 0
    case 'groups':
      return conversation.type === 'group'
  }
}

/**
 * IDs only, so the list changes when membership or order changes and each row watches its
 * own data. resultEqualityCheck keeps the same array when a recompute gives the same IDs.
 */
export const selectVisibleConversationIds = createAppSelector(
  [
    selectAllConversations,
    selectConversationFilter,
    selectConversationSearchQuery,
    selectUserEntities,
    selectCurrentUserId,
  ],
  (conversations, filter, searchQuery, users, currentUserId) => {
    const query = searchQuery.trim().toLowerCase()

    return conversations
      .filter(
        (conversation) =>
          matchesFilter(conversation, filter) &&
          titleOf(conversation, users, currentUserId).toLowerCase().includes(query),
      )
      .map(({ id }) => id)
  },
  { memoizeOptions: { resultEqualityCheck: shallowEqual } },
)

export const selectTotalUnreadCount = createAppSelector([selectAllConversations], (conversations) =>
  conversations.reduce((total, { unread }) => total + unread.count, 0),
)

export const selectUnreadCount = (state: RootState, conversationId: ConversationId) =>
  selectConversationById(state, conversationId)?.unread.count ?? 0

export const selectParticipants = createAppSelector(
  [selectConversationById, participantSelectors.selectEntities],
  (conversation, participants) =>
    (conversation?.participantIds ?? []).flatMap((userId) => {
      const participant = conversation && participants[participantKey(conversation.id, userId)]
      return participant ? [participant] : []
    }),
  { memoizeOptions: { resultEqualityCheck: shallowEqual } },
)

/** Whether the other person in a direct conversation is online. Groups have no single answer. */
export const selectIsDirectContactOnline = (state: RootState, conversationId: ConversationId) => {
  const conversation = selectConversationById(state, conversationId)

  if (conversation?.type !== 'direct') {
    return false
  }

  const otherId = otherParticipantId(conversation, selectCurrentUserId(state))
  return otherId ? selectIsUserOnline(state, otherId) : false
}

export const selectCanManageMembers = (state: RootState, conversationId: ConversationId) => {
  const currentUserId = selectCurrentUserId(state)

  if (selectConversationById(state, conversationId)?.type !== 'group' || !currentUserId) {
    return false
  }

  const role = participantSelectors.selectById(
    state,
    participantKey(conversationId, currentUserId),
  )?.role

  return role === 'owner' || role === 'admin'
}

export interface ConversationPreview {
  /** "You", or a first name in groups. */
  readonly senderLabel: string | null
  readonly text: string
  readonly isDeleted: boolean
  readonly sentAt: string
  /** Set for the current user's own messages, which show delivery ticks. */
  readonly deliveryStatus: MessageDeliveryStatus | null
}

const selectLastMessage = (state: RootState, conversationId: ConversationId) => {
  const lastMessageId = selectConversationById(state, conversationId)?.lastMessageId
  return lastMessageId ? selectMessageById(state, lastMessageId) : undefined
}

/** Derived from the message itself, so edits and deletes reach the sidebar with no extra work. */
export const selectConversationPreview = createAppSelector(
  [selectConversationById, selectLastMessage, selectUserEntities, selectCurrentUserId],
  (conversation, message, users, currentUserId): ConversationPreview | null => {
    if (!conversation || !message) {
      return null
    }

    const isOwn = message.senderId === currentUserId
    const sentAt = message.createdAt

    if (message.state === 'deleted') {
      return {
        senderLabel: null,
        text: isOwn ? 'You deleted this message' : 'This message was deleted',
        isDeleted: true,
        sentAt,
        deliveryStatus: null,
      }
    }

    const senderName = users[message.senderId]?.displayName.split(' ')[0] ?? null

    return {
      senderLabel: isOwn ? 'You' : conversation.type === 'group' ? senderName : null,
      text: message.text,
      isDeleted: false,
      sentAt,
      deliveryStatus: isOwn ? message.deliveryStatus : null,
    }
  },
)
