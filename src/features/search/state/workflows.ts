import type { AppThunk } from '@/app/hooks'
import { openConversation } from '@/features/conversations'
import {
  fetchMessages,
  selectMessageById,
  selectThreadHasMore,
  selectThreadMessageIds,
} from '@/features/messages'
import { messageHighlighted } from '@/features/ui'
import type { MessageId } from '@/types/ids'

/** Opens a result's conversation, loads back to the message if needed, and highlights it. */
export function openSearchResult(messageId: MessageId): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const conversationId = selectMessageById(getState(), messageId)?.conversationId

    if (!conversationId) {
      return
    }

    await dispatch(openConversation(conversationId))

    const isLoaded = () => selectThreadMessageIds(getState(), conversationId).includes(messageId)

    while (!isLoaded() && selectThreadHasMore(getState(), conversationId)) {
      const before = selectThreadMessageIds(getState(), conversationId)[0]
      const page = await dispatch(fetchMessages({ conversationId, ...(before ? { before } : {}) }))

      // The thread shows its own error, and retrying here would loop forever.
      if (fetchMessages.rejected.match(page)) {
        return
      }
    }

    if (isLoaded()) {
      dispatch(messageHighlighted(messageId))
    }
  }
}
