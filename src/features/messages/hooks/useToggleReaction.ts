import { useAppDispatch } from '@/app/hooks'
import { toggleReaction } from '@/features/messages/state/workflows'
import { getFailureMessage } from '@/lib/failureMessage'
import type { MessageId } from '@/types/ids'

/** Returns a function that toggles an emoji on this message and reports why it failed. */
export function useToggleReaction(messageId: MessageId, onFailure: (message: string) => void) {
  const dispatch = useAppDispatch()

  return (emoji: string) => {
    dispatch(toggleReaction({ messageId, emoji })).catch((failure: unknown) => {
      onFailure(getFailureMessage(failure))
    })
  }
}
