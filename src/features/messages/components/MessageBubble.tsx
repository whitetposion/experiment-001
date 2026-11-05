import { Ban } from 'lucide-react'
import { memo } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Avatar } from '@/components/ui/Avatar'
import {
  selectMessageView,
  type ReactionSummary,
  type ReplyPreview,
} from '@/features/messages/state/selectors'
import { toggleReaction } from '@/features/messages/state/workflows'
import type { ApiFailure } from '@/services/apiError'
import { cn } from '@/lib/cn'
import { formatMessageDay } from '@/lib/formatMessageDate'
import { getInitials } from '@/lib/initials'
import type { MessageId } from '@/types/ids'
import { MessageActions } from './MessageActions'
import { MessageStatusIndicator } from './MessageStatusIndicator'
import { MessageTimestamp } from './MessageTimestamp'

function DayDivider({ timestamp }: { timestamp: string }) {
  return (
    <div className="flex justify-center py-3">
      <span className="rounded-pill bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        {formatMessageDay(timestamp)}
      </span>
    </div>
  )
}

function ReplyQuote({ isOwn, reply }: { isOwn: boolean; reply: ReplyPreview }) {
  return (
    <div
      className={cn(
        'mb-1 rounded-sm border-l-2 px-2 py-1 text-xs',
        isOwn
          ? 'border-bubble-own-accent bg-bubble-own-foreground/10'
          : 'border-primary bg-foreground/5',
      )}
    >
      {reply.senderName ? <p className="font-semibold">{reply.senderName}</p> : null}
      <p className={cn('line-clamp-2', isOwn ? 'text-bubble-own-muted' : 'text-muted-foreground')}>
        {reply.text}
      </p>
    </div>
  )
}

function ReactionChip({
  messageId,
  onNotice,
  reaction,
}: {
  messageId: MessageId
  onNotice: (message: string) => void
  reaction: ReactionSummary
}) {
  const dispatch = useAppDispatch()
  const { count, emoji, reactedByCurrentUser } = reaction

  return (
    <button
      aria-label={`${emoji} ${String(count)} ${count === 1 ? 'reaction' : 'reactions'}`}
      aria-pressed={reactedByCurrentUser}
      className={cn(
        'inline-flex min-h-6 items-center gap-1 rounded-pill bg-muted px-2 text-xs font-medium',
        'text-muted-foreground transition-colors duration-fast hover:bg-secondary',
        'focus-visible:outline-2 focus-visible:outline-offset-1',
        reactedByCurrentUser && 'ring-1 ring-primary',
      )}
      onClick={() => {
        dispatch(toggleReaction({ messageId, emoji })).catch((failure: unknown) => {
          onNotice((failure as ApiFailure).message)
        })
      }}
      type="button"
    >
      {emoji} {count}
    </button>
  )
}

export interface MessageBubbleProps {
  messageId: MessageId
  previousMessageId: MessageId | undefined
  /** Groups show who sent each message. Direct conversations do not need to. */
  showSender: boolean
  onReply: (messageId: MessageId) => void
  onEdit: (messageId: MessageId) => void
  onDelete: (messageId: MessageId) => void
  onNotice: (message: string) => void
  isFirstUnread: boolean
  isHighlighted: boolean
}

// memo pays off here: the list re-renders for every new message, and without it every
// bubble would re-render too. It relies on stable props, so a parent that re-renders often
// must keep onReply stable.
export const MessageBubble = memo(function MessageBubble({
  isFirstUnread,
  isHighlighted,
  messageId,
  onDelete,
  onEdit,
  onNotice,
  onReply,
  previousMessageId,
  showSender,
}: MessageBubbleProps) {
  const view = useAppSelector((state) => selectMessageView(state, messageId, previousMessageId))

  if (!view) {
    return null
  }

  const { isOwn, isRunStart, message, reactions, reply, senderName, startsNewDay } = view
  const isActive = message.state === 'active'
  const showAvatarColumn = showSender && !isOwn
  const showSenderName = showSender && !isOwn && isRunStart

  return (
    <li
      className={cn(
        'rounded-lg transition-colors duration-slow outline-none',
        isRunStart ? 'mt-3' : 'mt-0.5',
        isHighlighted && 'bg-primary/subtle',
      )}
      data-message-id={messageId}
      tabIndex={-1}
    >
      {startsNewDay ? <DayDivider timestamp={message.createdAt} /> : null}
      {isFirstUnread ? (
        <div className="flex items-center gap-3 py-2 text-xs font-medium text-muted-foreground">
          <span aria-hidden="true" className="h-px flex-1 bg-border-strong" />
          Unread messages
          <span aria-hidden="true" className="h-px flex-1 bg-border-strong" />
        </div>
      ) : null}
      <div className={cn('group flex items-center gap-1', isOwn && 'flex-row-reverse')}>
        {showAvatarColumn ? (
          <span className="size-8 shrink-0 self-start">
            {isRunStart ? <Avatar alt="" fallback={getInitials(senderName)} size="sm" /> : null}
          </span>
        ) : null}
        <div
          className={cn(
            'max-w-[min(80%,36rem)] min-w-0 rounded-lg px-3 py-1.5 text-sm shadow-sm',
            isOwn
              ? 'bg-bubble-own text-bubble-own-foreground'
              : 'bg-bubble-other text-bubble-other-foreground',
            isRunStart && (isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'),
          )}
        >
          <span className="sr-only">{senderName}: </span>
          {showSenderName ? (
            <p aria-hidden="true" className="text-xs font-semibold text-primary">
              {senderName}
            </p>
          ) : null}
          {reply ? <ReplyQuote isOwn={isOwn} reply={reply} /> : null}
          {isActive ? (
            <p className="wrap-anywhere whitespace-pre-wrap">{message.text}</p>
          ) : (
            <p className="flex items-center gap-1 italic opacity-80">
              <Ban aria-hidden="true" className="size-4 shrink-0" />
              {isOwn ? 'You deleted this message' : 'This message was deleted'}
            </p>
          )}
          <div
            className={cn(
              'flex items-center justify-end gap-1',
              isOwn ? 'text-bubble-own-muted' : 'text-muted-foreground',
            )}
          >
            <MessageTimestamp
              isEdited={isActive && message.editedAt !== null}
              timestamp={message.createdAt}
            />
            {isOwn && isActive ? (
              <MessageStatusIndicator
                readClassName="text-bubble-own-accent"
                status={message.deliveryStatus}
              />
            ) : null}
          </div>
        </div>
        {isActive ? (
          <MessageActions
            isOwn={isOwn}
            messageId={messageId}
            onDelete={onDelete}
            onEdit={onEdit}
            onNotice={onNotice}
            onReply={onReply}
            reactions={reactions}
            senderName={senderName}
            text={message.text}
          />
        ) : null}
      </div>
      {reactions.length > 0 ? (
        <div
          className={cn(
            'mt-0.5 flex flex-wrap gap-1',
            isOwn ? 'justify-end' : showAvatarColumn && 'pl-9',
          )}
        >
          {reactions.map((reaction) => (
            <ReactionChip
              key={reaction.emoji}
              messageId={messageId}
              onNotice={onNotice}
              reaction={reaction}
            />
          ))}
        </div>
      ) : null}
    </li>
  )
})
