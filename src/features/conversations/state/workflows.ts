import type { AppThunk } from '@/app/hooks'
import { fetchMessages, selectThreadStatus } from '@/features/messages'
import { selectCurrentUserId } from '@/features/presence'
import type { ConversationId } from '@/types/ids'
import { selectConversationById } from './selectors'
import { conversationLeft, conversationSelected, unreadMarkerSet } from './slice'
import { markConversationRead, removeGroupMember } from './thunks'

/** Selects a conversation, loads its messages the first time, and clears its unread count. */
export function openConversation(conversationId: ConversationId): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const unread = selectConversationById(getState(), conversationId)?.unread

    dispatch(conversationSelected(conversationId))

    if (unread?.firstUnreadMessageId) {
      dispatch(unreadMarkerSet(unread.firstUnreadMessageId))
    }

    const status = selectThreadStatus(getState(), conversationId)
    const hasUnread = (unread?.count ?? 0) > 0

    await Promise.all([
      status === 'idle' || status === 'failed' ? dispatch(fetchMessages({ conversationId })) : null,
      hasUnread ? dispatch(markConversationRead(conversationId)) : null,
    ])
  }
}

/** Rejects with the API failure, so the caller can show why leaving did not work. */
export function leaveGroup(conversationId: ConversationId): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const userId = selectCurrentUserId(getState())

    if (userId) {
      await dispatch(removeGroupMember({ conversationId, userId })).unwrap()
      dispatch(conversationLeft(conversationId))
    }
  }
}
