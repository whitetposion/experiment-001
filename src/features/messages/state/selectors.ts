import { createAppSelector, type RootState } from '@/app/hooks'
import { selectCurrentUserId, selectUserEntities } from '@/features/presence'
import { isSameDay } from '@/lib/calendar'
import type { ConversationId, MessageId } from '@/types/ids'
import type { Message } from '@/types/message'
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

/** Messages this close together from one sender read as a single run. */
const RUN_WINDOW_MS = 5 * 60_000

function isSameRun(previous: Message, message: Message) {
  const gap = new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime()

  return (
    previous.senderId === message.senderId &&
    gap < RUN_WINDOW_MS &&
    isSameDay(previous.createdAt, message.createdAt)
  )
}

export interface ReplyPreview {
  /** Null when the original message has not been loaded. */
  readonly senderName: string | null
  readonly text: string
}

export interface MessageView {
  readonly message: Message
  readonly isOwn: boolean
  readonly senderName: string
  readonly isRunStart: boolean
  readonly startsNewDay: boolean
  readonly reply: ReplyPreview | null
  readonly reactions: readonly ReactionSummary[]
}

const selectPreviousMessage = (
  state: RootState,
  _messageId: MessageId,
  previousMessageId: MessageId | undefined,
) => (previousMessageId ? selectMessageById(state, previousMessageId) : undefined)

/**
 * Everything one bubble renders, from a single subscription. It only returns a new object
 * when this message, the one before it, or the message it replies to changes.
 */
export const selectMessageView = createAppSelector(
  [
    selectMessageById,
    selectPreviousMessage,
    selectReplyTarget,
    selectReactionSummary,
    selectUserEntities,
    selectCurrentUserId,
  ],
  (message, previous, replyTarget, reactions, users, currentUserId): MessageView | null => {
    if (!message) {
      return null
    }

    const nameOf = (sender: Message) =>
      sender.senderId === currentUserId
        ? 'You'
        : (users[sender.senderId]?.displayName ?? 'Unknown contact')

    function replyPreview(): ReplyPreview | null {
      // A deleted message shows none of its content, and that includes what it quoted.
      if (message?.state !== 'active' || !message.replyToMessageId) {
        return null
      }

      if (!replyTarget) {
        return { senderName: null, text: 'Original message' }
      }

      return {
        senderName: nameOf(replyTarget),
        text: replyTarget.state === 'active' ? replyTarget.text : 'This message was deleted',
      }
    }

    return {
      message,
      isOwn: message.senderId === currentUserId,
      senderName: nameOf(message),
      isRunStart: !previous || !isSameRun(previous, message),
      startsNewDay: !previous || !isSameDay(previous.createdAt, message.createdAt),
      reply: replyPreview(),
      reactions,
    }
  },
)
