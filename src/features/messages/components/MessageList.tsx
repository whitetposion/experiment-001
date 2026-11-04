import { ArrowDown } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Button } from '@/components/ui/Button'
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
import { cn } from '@/lib/cn'
import type { ConversationId, MessageId } from '@/types/ids'
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
}

export function MessageList({ conversationId, onReply, showSender }: MessageListProps) {
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
    isLatestOwn,
    messageIds: ids,
  })

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
        className="flex h-full flex-col overflow-y-auto overscroll-contain p-3 md:px-gutter"
        onScroll={handleScroll}
        ref={scrollerRef}
        role="log"
        // Lets keyboard users scroll the history with the arrow keys.
        tabIndex={0}
      >
        {isInitialLoad ? <ThreadSkeleton /> : null}

        {status === 'failed' ? (
          <div className="m-auto flex flex-col items-center gap-2 text-center" role="alert">
            <p className="text-sm text-muted-foreground">
              {error?.message ?? 'Something went wrong. Try again.'}
            </p>
            <Button
              onClick={() => {
                loadPage(ids.length > 0 ? oldestId : undefined)
              }}
              size="sm"
              variant="secondary"
            >
              Try again
            </Button>
          </div>
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
                key={id}
                messageId={id}
                onReply={onReply}
                previousMessageId={ids[index - 1]}
                showSender={showSender}
              />
            ))}
          </ol>
        ) : null}
      </div>

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
