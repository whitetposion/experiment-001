import { shallowEqual } from 'react-redux'
import { createAppSelector, type RootState } from '@/app/hooks'
import { selectMessageById } from '@/features/messages'
import {
  selectAllUsers,
  selectCurrentUserId,
  selectIsUserOnline,
  selectPresenceEntities,
  selectTypingUserIds,
  selectUserEntities,
  selectUserPresence,
} from '@/features/presence'
import { formatLastSeen } from '@/lib/formatConversationTime'
import { deletedMessageLabel, firstName, UNKNOWN_CONTACT } from '@/lib/senderLabels'
import {
  canRoleManageMembers,
  type Conversation,
  type ConversationFilter,
  type ParticipantRole,
} from '@/types/conversation'
import { conversationMemberKey, type ConversationId, type UserId } from '@/types/ids'
import type { MessageDeliveryStatus } from '@/types/message'
import type { User } from '@/types/user'
import { conversationsAdapter, participantsAdapter } from './slice'

const adapterSelectors = conversationsAdapter.getSelectors(
  (state: RootState) => state.conversations,
)
const participantSelectors = participantsAdapter.getSelectors(
  (state: RootState) => state.conversations.participants,
)

export const selectConversationById = adapterSelectors.selectById
export const selectAllConversations = adapterSelectors.selectAll

export const selectConversationCount = adapterSelectors.selectTotal

export const selectSelectedConversationId = (state: RootState) =>
  state.conversations.selectedConversationId
export const selectUnreadMarkerId = (state: RootState) => state.conversations.unreadMarkerId
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

/** The other person in a direct conversation. Groups have no single contact. */
const selectDirectContactId = (state: RootState, conversationId: ConversationId) => {
  const conversation = selectConversationById(state, conversationId)

  return conversation?.type === 'direct'
    ? otherParticipantId(conversation, selectCurrentUserId(state))
    : undefined
}

export const selectIsGroupConversation = (state: RootState, conversationId: ConversationId) =>
  selectConversationById(state, conversationId)?.type === 'group'

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

  const otherId = selectDirectContactId(state, conversationId)
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
      const participant =
        conversation && participants[conversationMemberKey(conversation.id, userId)]
      return participant ? [participant] : []
    }),
  { memoizeOptions: { resultEqualityCheck: shallowEqual } },
)

/** Whether the other person in a direct conversation is online. Groups have no single answer. */
export const selectIsDirectContactOnline = (state: RootState, conversationId: ConversationId) => {
  const otherId = selectDirectContactId(state, conversationId)
  return otherId ? selectIsUserOnline(state, otherId) : false
}

/** What the chat header shows under the title. A string, so it only updates when it changes. */
export const selectConversationSubtitle = (state: RootState, conversationId: ConversationId) => {
  const conversation = selectConversationById(state, conversationId)

  if (!conversation) {
    return ''
  }

  if (conversation.type === 'group') {
    return `${String(conversation.participantIds.length)} members`
  }

  const otherId = selectDirectContactId(state, conversationId)
  const presence = otherId ? selectUserPresence(state, otherId) : undefined

  if (presence?.status === 'online') {
    return 'Online'
  }

  return presence?.lastSeenAt ? formatLastSeen(presence.lastSeenAt) : ''
}

/** Who is typing, in words, or null. A string, so it only updates when the words change. */
export const selectTypingLabel = (state: RootState, conversationId: ConversationId) => {
  const conversation = selectConversationById(state, conversationId)
  const typingIds = selectTypingUserIds(state, conversationId)
  const [firstId, secondId] = typingIds

  if (!conversation || !firstId) {
    return null
  }

  if (conversation.type === 'direct') {
    return 'typing…'
  }

  const users = selectUserEntities(state)
  const nameOf = (userId: UserId) => firstName(users[userId]?.displayName) ?? 'Someone'

  if (typingIds.length > 2) {
    return 'Several people are typing…'
  }

  return secondId
    ? `${nameOf(firstId)} and ${nameOf(secondId)} are typing…`
    : `${nameOf(firstId)} is typing…`
}

export const selectCanManageMembers = (state: RootState, conversationId: ConversationId) => {
  const currentUserId = selectCurrentUserId(state)

  if (selectConversationById(state, conversationId)?.type !== 'group' || !currentUserId) {
    return false
  }

  const role = participantSelectors.selectById(
    state,
    conversationMemberKey(conversationId, currentUserId),
  )?.role

  return canRoleManageMembers(role)
}

export const selectGroupCreatorName = (state: RootState, conversationId: ConversationId) => {
  const creatorId = selectConversationById(state, conversationId)?.creatorId

  if (!creatorId) {
    return null
  }

  return creatorId === selectCurrentUserId(state)
    ? 'you'
    : (selectUserEntities(state)[creatorId]?.displayName ?? null)
}

export interface GroupMemberView {
  readonly userId: UserId
  readonly name: string
  readonly role: ParticipantRole
  readonly isCurrentUser: boolean
  readonly isOnline: boolean
  readonly lastSeenAt: string | null
  /** Matches what the backend allows, so the UI never offers an action that must fail. */
  readonly canRemove: boolean
}

const ROLE_ORDER: Record<ParticipantRole, number> = { owner: 0, admin: 1, member: 2 }

/** Owners first, then admins, then members by name. */
export const selectGroupMembers = createAppSelector(
  [selectParticipants, selectUserEntities, selectPresenceEntities, selectCurrentUserId],
  (participants, users, presence, currentUserId): readonly GroupMemberView[] => {
    const canManage = canRoleManageMembers(
      participants.find(({ userId }) => userId === currentUserId)?.role,
    )

    return participants
      .map(({ role, userId }) => {
        const isCurrentUser = userId === currentUserId

        return {
          userId,
          name: users[userId]?.displayName ?? UNKNOWN_CONTACT,
          role,
          isCurrentUser,
          isOnline: presence[userId]?.status === 'online',
          lastSeenAt: presence[userId]?.lastSeenAt ?? null,
          canRemove: canManage && !isCurrentUser && role !== 'owner',
        }
      })
      .sort(
        (first, second) =>
          ROLE_ORDER[first.role] - ROLE_ORDER[second.role] || first.name.localeCompare(second.name),
      )
  },
)

/** People who could join this group, by name. */
export const selectAddableUsers = createAppSelector(
  [selectConversationById, selectAllUsers],
  (conversation, users) =>
    users
      .filter(({ id }) => !conversation?.participantIds.includes(id))
      .sort((first, second) => first.displayName.localeCompare(second.displayName)),
)

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
        text: deletedMessageLabel(isOwn),
        isDeleted: true,
        sentAt,
        deliveryStatus: null,
      }
    }

    const senderName = firstName(users[message.senderId]?.displayName) ?? null

    return {
      senderLabel: isOwn ? 'You' : conversation.type === 'group' ? senderName : null,
      text: message.text,
      isDeleted: false,
      sentAt,
      deliveryStatus: isOwn ? message.deliveryStatus : null,
    }
  },
)
