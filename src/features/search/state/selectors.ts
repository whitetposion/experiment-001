import { createAppSelector, type RootState } from '@/app/hooks'
import { selectConversationSearchQuery, selectConversationTitle } from '@/features/conversations'
import { selectMessageById } from '@/features/messages'
import { selectCurrentUserId, selectUserEntities } from '@/features/presence'
import type { MessageId } from '@/types/ids'
import { MIN_QUERY_LENGTH } from './slice'

export const selectMessageSearchStatus = (state: RootState) => state.search.status
export const selectMessageSearchError = (state: RootState) => state.search.error

export const selectIsMessageSearchActive = (state: RootState) =>
  selectConversationSearchQuery(state).trim().length >= MIN_QUERY_LENGTH

/** Drops a result deleted since the search ran. Its text must not stay on screen. */
export const selectMessageSearchResultIds = createAppSelector(
  [(state: RootState) => state.search.resultIds, (state: RootState) => state.messages.entities],
  (ids, messages) => ids.filter((id) => messages[id]?.state === 'active'),
  { memoizeOptions: { resultEqualityCheck: shallowEqualIds } },
)

function shallowEqualIds(first: readonly MessageId[], second: readonly MessageId[]) {
  return first.length === second.length && first.every((id, index) => id === second[index])
}

export interface MessageSearchResultView {
  readonly conversationTitle: string
  readonly senderLabel: string
  readonly text: string
  readonly sentAt: string
}

const selectResultConversationTitle = (state: RootState, messageId: MessageId) => {
  const conversationId = selectMessageById(state, messageId)?.conversationId
  return conversationId ? selectConversationTitle(state, conversationId) : ''
}

/** One row's data from one subscription. */
export const selectMessageSearchResultView = createAppSelector(
  [selectMessageById, selectResultConversationTitle, selectUserEntities, selectCurrentUserId],
  (message, conversationTitle, users, currentUserId): MessageSearchResultView | null => {
    if (message?.state !== 'active') {
      return null
    }

    const senderLabel =
      message.senderId === currentUserId
        ? 'You'
        : (users[message.senderId]?.displayName.split(' ')[0] ?? 'Unknown contact')

    return { conversationTitle, senderLabel, text: message.text, sentAt: message.createdAt }
  },
)
