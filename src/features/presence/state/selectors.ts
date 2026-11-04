import { createAppSelector, type RootState } from '@/app/hooks'
import type { ConversationId, UserId } from '@/types/ids'
import { presenceAdapter, typingAdapter, usersAdapter } from './slice'

const userSelectors = usersAdapter.getSelectors((state: RootState) => state.presence.users)
const statusSelectors = presenceAdapter.getSelectors((state: RootState) => state.presence.statuses)
const typingSelectors = typingAdapter.getSelectors((state: RootState) => state.presence.typing)

export const selectUserById = userSelectors.selectById
export const selectUserEntities = userSelectors.selectEntities
export const selectAllUsers = userSelectors.selectAll

export const selectCurrentUserId = (state: RootState) => state.presence.currentUserId

export const selectCurrentUser = (state: RootState) => {
  const currentUserId = selectCurrentUserId(state)
  return currentUserId ? userSelectors.selectById(state, currentUserId) : undefined
}

export const selectDirectoryStatus = (state: RootState) => state.presence.status
export const selectDirectoryError = (state: RootState) => state.presence.error

export const selectUserPresence = statusSelectors.selectById

/** A boolean, so a component only re-renders when this user goes online or offline. */
export const selectIsUserOnline = (state: RootState, userId: UserId) =>
  statusSelectors.selectById(state, userId)?.status === 'online'

export const selectTypingUserIds = createAppSelector(
  [
    typingSelectors.selectAll,
    (_state: RootState, conversationId: ConversationId) => conversationId,
  ],
  (indicators, conversationId) =>
    indicators
      .filter((indicator) => indicator.conversationId === conversationId)
      .map(({ userId }) => userId),
)
