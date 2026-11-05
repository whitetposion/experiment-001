import type { AppThunk } from '@/app/hooks'
import type { ReactionRequest } from '@/services/chatApi'
import { selectReactionSummary } from './selectors'
import { addReaction, removeReaction } from './thunks'

/** Adds the reaction, or removes it if it is already there. Rejects with the API failure. */
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
