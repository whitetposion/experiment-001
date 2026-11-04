import { Ban } from 'lucide-react'
import { memo } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Badge } from '@/components/ui/Badge'
import {
  selectConversationPreview,
  selectConversationTitle,
  selectIsDirectContactOnline,
  selectSelectedConversationId,
  selectUnreadCount,
} from '@/features/conversations/state/selectors'
import { openConversation } from '@/features/conversations/state/workflows'
import { MessageStatusIndicator } from '@/features/messages'
import { cn } from '@/lib/cn'
import { formatConversationTime } from '@/lib/formatConversationTime'
import type { ConversationId } from '@/types/ids'
import { ConversationAvatar } from './ConversationAvatar'

/** Separates parts of the row for screen readers, which would otherwise run words together. */
function Pause() {
  return <span className="sr-only">, </span>
}

export interface ConversationItemProps {
  conversationId: ConversationId
}

export const ConversationItem = memo(function ConversationItem({
  conversationId,
}: ConversationItemProps) {
  const dispatch = useAppDispatch()
  const title = useAppSelector((state) => selectConversationTitle(state, conversationId))
  const preview = useAppSelector((state) => selectConversationPreview(state, conversationId))
  const unreadCount = useAppSelector((state) => selectUnreadCount(state, conversationId))
  const isSelected = useAppSelector(
    (state) => selectSelectedConversationId(state) === conversationId,
  )
  const isOnline = useAppSelector((state) => selectIsDirectContactOnline(state, conversationId))
  const hasUnread = unreadCount > 0
  // The selected background needs its own text color to stay readable in every theme.
  const quietText = isSelected ? 'text-secondary-foreground' : 'text-muted-foreground'

  return (
    <li>
      <button
        aria-current={isSelected ? 'true' : undefined}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-fast',
          'focus-visible:outline-2 focus-visible:-outline-offset-2',
          isSelected ? 'bg-secondary' : 'hover:bg-muted',
        )}
        onClick={() => {
          void dispatch(openConversation(conversationId))
        }}
        type="button"
      >
        <ConversationAvatar conversationId={conversationId} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate font-semibold tracking-tight">
              {title}
              {isOnline ? <span className="sr-only">, Online</span> : null}
              <Pause />
            </span>
            {preview ? (
              <time
                className={cn(
                  'shrink-0 text-xs tabular-nums',
                  hasUnread && !isSelected ? 'font-medium text-primary' : quietText,
                )}
                dateTime={preview.sentAt}
              >
                {formatConversationTime(preview.sentAt)}
                <Pause />
              </time>
            ) : null}
          </span>
          <span className={cn('flex items-center gap-2 text-sm', quietText)}>
            {preview?.deliveryStatus ? (
              <MessageStatusIndicator
                readClassName="text-primary"
                status={preview.deliveryStatus}
              />
            ) : null}
            {preview?.isDeleted ? <Ban aria-hidden="true" className="size-4 shrink-0" /> : null}
            <span className={cn('min-w-0 flex-1 truncate', preview?.isDeleted && 'italic')}>
              {preview?.senderLabel ? `${preview.senderLabel}: ` : null}
              {preview?.text ?? 'No messages yet'}
              {hasUnread ? <Pause /> : null}
            </span>
            {hasUnread ? (
              <Badge className="min-w-5 tabular-nums" variant="primary">
                <span aria-hidden="true">{unreadCount}</span>
                <span className="sr-only">
                  {unreadCount === 1
                    ? '1 unread message'
                    : `${String(unreadCount)} unread messages`}
                </span>
              </Badge>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  )
})
