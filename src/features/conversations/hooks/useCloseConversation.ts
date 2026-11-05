import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useAppDispatch } from '@/app/hooks'
import { focusConversationRow } from '@/features/conversations/components/focus'
import { conversationSelected } from '@/features/conversations/state/slice'
import type { ConversationId } from '@/types/ids'

/** Returns to the list with focus on the row just left, which a phone needs to find its place. */
export function useCloseConversation() {
  const dispatch = useAppDispatch()

  return useCallback(
    (conversationId: ConversationId) => {
      // The row is hidden until this renders, and it needs to be visible to take focus.
      flushSync(() => {
        dispatch(conversationSelected(null))
      })
      focusConversationRow(conversationId)
    },
    [dispatch],
  )
}
