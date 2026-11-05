import type { AppThunk } from '@/app/hooks'
import type { ReactionRequest } from '@/services/chatApi'
import { selectReactionSummary } from './selectors'
import { addReaction, removeReaction } from './thunks'

/**
 * Removes the reaction if the user already chose it. Otherwise adds it, which replaces any
 * other reaction of theirs. Rejects with the API failure.
 */
export function toggleReaction(request: ReactionRequest): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const existing = selectReactionSummary(getState(), request.messageId).find(
      ({ emoji }) => emoji === request.emoji,
    )

    await dispatch(
      existing?.reactedByCurrentUser ? removeReaction(request) : addReaction(request),
    ).unwrap()
  }
}
