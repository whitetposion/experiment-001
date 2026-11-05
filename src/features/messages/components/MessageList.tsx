import { ArrowDown } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Button } from '@/components/ui/Button'
import { ErrorRetry } from '@/components/ui/ErrorRetry'
import { IconButton } from '@/components/ui/IconButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { useChatScroll } from '@/features/messages/hooks/useChatScroll'
import {
  selectIsOwnMessage,
  selectThreadError,
  selectThreadHasMore,
  selectThreadMessageIds,
  selectThreadStatus,
} from '@/features/messages/state/selectors'
import { fetchMessages } from '@/features/messages/state/thunks'
import { useTimedNotice } from '@/hooks/useTimedNotice'
import { cn } from '@/lib/cn'
import type { ConversationId, MessageId } from '@/types/ids'
import { DeleteMessageDialog } from './DeleteMessageDialog'
import { MessageBubble } from './MessageBubble'

const SKELETON_BUBBLES = [
  'ml-auto w-1/2',
  'w-2/3',
  'w-2/5',
  'ml-auto w-3/5',
  'w-1/2',
  'ml-auto w-1/3',
]

function ThreadSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading messages"
      className="mt-auto flex flex-col gap-3"
      role="status"
    >
      {SKELETON_BUBBLES.map((width) => (
        <Skeleton className={cn('h-10 rounded-lg', width)} key={width} />
      ))}
    </div>
  )
}

export interface MessageListProps {
  conversationId: ConversationId
  showSender: boolean
  onReply: (messageId: MessageId) => void
  onEdit: (messageId: MessageId) => void
  /** The first unread message when the chat was opened. */
  unreadMarkerId?: MessageId | null
  highlightedMessageId?: MessageId | null
}

export function MessageList({
  conversationId,
  highlightedMessageId = null,
  onEdit,
  onReply,
  showSender,
  unreadMarkerId = null,
}: MessageListProps) {
  const dispatch = useAppDispatch()
  const ids = useAppSelector((state) => selectThreadMessageIds(state, conversationId))
  const status = useAppSelector((state) => selectThreadStatus(state, conversationId))
  const error = useAppSelector((state) => selectThreadError(state, conversationId))
  const hasMore = useAppSelector((state) => selectThreadHasMore(state, conversationId))
  const latestId = ids.at(-1)
  const isLatestOwn = useAppSelector((state) =>
    latestId ? selectIsOwnMessage(state, latestId) : false,
  )
  const { handleScroll, isAwayFromBottom, scrollerRef, scrollToBottom } = useChatScroll({
    highlightedMessageId,
    isLatestOwn,
    messageIds: ids,
    openAtMessageId: unreadMarkerId,
  })

  const { notice, showNotice } = useTimedNotice()
  const [pendingDeleteId, setPendingDeleteId] = useState<MessageId | null>(null)
  const lastDeleteTargetRef = useRef<MessageId | null>(null)

  // Stable, because this list re-renders for each new message and memo on every bubble
  // depends on it. The notice and pending delete state also live here for that reason.
  const handleDelete = useCallback((messageId: MessageId) => {
    lastDeleteTargetRef.current = messageId
    setPendingDeleteId(messageId)
  }, [])

  /** Back to the message's menu button, or the list if the message no longer has one. */
  function restoreFocusAfterDelete() {
    const scroller = scrollerRef.current
    const target = lastDeleteTargetRef.current
    const trigger =
      target && scroller?.querySelector<HTMLElement>(`[data-message-actions="${target}"]`)

    ;(trigger ?? scroller)?.focus()
  }

  const oldestId = ids[0]
  const isLoading = status === 'loading'
  const isInitialLoad = ids.length === 0 && (status === 'idle' || isLoading)

  function loadPage(before?: MessageId) {
    void dispatch(fetchMessages({ conversationId, ...(before ? { before } : {}) }))
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        aria-label="Messages"
        // relative keeps absolutely positioned screen reader text inside this scroller.
        className="relative flex h-full flex-col overflow-y-auto overscroll-contain p-3 md:px-gutter"
        onScroll={handleScroll}
        ref={scrollerRef}
        role="log"
        // Lets keyboard users scroll the history with the arrow keys.
        tabIndex={0}
      >
        {isInitialLoad ? <ThreadSkeleton /> : null}

        {status === 'failed' ? (
          <ErrorRetry
            className="m-auto items-center text-center"
            message={error?.message}
            onRetry={() => {
              loadPage(ids.length > 0 ? oldestId : undefined)
            }}
          />
        ) : null}

        {status === 'succeeded' && ids.length === 0 ? (
          <p className="m-auto text-sm text-muted-foreground">
            No messages yet. Send the first one.
          </p>
        ) : null}

        {hasMore && status !== 'failed' ? (
          <div className="flex justify-center pb-2">
            <Button
              loading={isLoading}
              onClick={() => {
                loadPage(oldestId)
              }}
              size="sm"
              variant="secondary"
            >
              Load earlier messages
            </Button>
          </div>
        ) : null}

        {ids.length > 0 ? (
          <ol className="mt-auto">
            {ids.map((id, index) => (
              <MessageBubble
                isFirstUnread={id === unreadMarkerId}
                isHighlighted={id === highlightedMessageId}
                key={id}
                messageId={id}
                onDelete={handleDelete}
                onEdit={onEdit}
                onNotice={showNotice}
                onReply={onReply}
                previousMessageId={ids[index - 1]}
                showSender={showSender}
              />
            ))}
          </ol>
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center"
        role="status"
      >
        {notice ? (
          <span className="animate-fade-in rounded-pill bg-foreground px-3 py-1.5 text-xs text-background shadow-md">
            {notice}
          </span>
        ) : null}
      </div>

      <DeleteMessageDialog
        messageId={pendingDeleteId}
        onClose={() => {
          setPendingDeleteId(null)
        }}
        onCloseAutoFocus={restoreFocusAfterDelete}
      />

      {isAwayFromBottom ? (
        <IconButton
          className="absolute right-3 bottom-3 shadow-md"
          label="Scroll to latest message"
          onClick={scrollToBottom}
          variant="outline"
        >
          <ArrowDown aria-hidden="true" />
        </IconButton>
      ) : null}
    </div>
  )
}
