import { createAppSelector, type RootState } from '@/app/hooks'
import { selectCurrentUserId } from '@/features/presence'
import type { ConversationId, MessageId } from '@/types/ids'
import { EMPTY_THREAD, messagesAdapter } from './slice'

const adapterSelectors = messagesAdapter.getSelectors((state: RootState) => state.messages)

export const selectMessageById = adapterSelectors.selectById

/** Falls back to one shared object, so an unloaded thread never looks like a change. */
const selectThread = (state: RootState, conversationId: ConversationId) =>
  state.messages.threads[conversationId] ?? EMPTY_THREAD

export const selectThreadMessageIds = (state: RootState, conversationId: ConversationId) =>
  selectThread(state, conversationId).ids

export const selectThreadStatus = (state: RootState, conversationId: ConversationId) =>
  selectThread(state, conversationId).status

export const selectThreadError = (state: RootState, conversationId: ConversationId) =>
  selectThread(state, conversationId).error

export const selectThreadHasMore = (state: RootState, conversationId: ConversationId) =>
  selectThread(state, conversationId).hasMore

export const selectIsOwnMessage = (state: RootState, messageId: MessageId) =>
  selectMessageById(state, messageId)?.senderId === selectCurrentUserId(state)

/** The message a reply points to, or undefined if it has not been loaded. */
export const selectReplyTarget = (state: RootState, messageId: MessageId) => {
  const replyToMessageId = selectMessageById(state, messageId)?.replyToMessageId
  return replyToMessageId ? selectMessageById(state, replyToMessageId) : undefined
}

export interface ReactionSummary {
  readonly emoji: string
  readonly count: number
  readonly reactedByCurrentUser: boolean
}

const NO_REACTIONS: readonly ReactionSummary[] = []

/** One entry per emoji, in the order each first appeared. */
export const selectReactionSummary = createAppSelector(
  [selectMessageById, selectCurrentUserId],
  (message, currentUserId): readonly ReactionSummary[] => {
    if (message?.state !== 'active' || message.reactions.length === 0) {
      return NO_REACTIONS
    }

    const summaries = new Map<string, ReactionSummary>()

    for (const { emoji, userId } of message.reactions) {
      const summary = summaries.get(emoji)

      summaries.set(emoji, {
        emoji,
        count: (summary?.count ?? 0) + 1,
        reactedByCurrentUser: (summary?.reactedByCurrentUser ?? false) || userId === currentUserId,
      })
    }

    return [...summaries.values()]
  },
)
