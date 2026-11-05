import { memo } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { ErrorRetry } from '@/components/ui/ErrorRetry'
import { listRowClasses } from '@/components/ui/listRow.variants'
import { ScreenReaderPause } from '@/components/ui/ScreenReaderPause'
import { Skeleton } from '@/components/ui/Skeleton'
import { selectConversationSearchQuery } from '@/features/conversations'
import {
  selectIsMessageSearchActive,
  selectMessageSearchError,
  selectMessageSearchResultIds,
  selectMessageSearchResultView,
  selectMessageSearchStatus,
} from '@/features/search/state/selectors'
import { searchMessages } from '@/features/search/state/thunks'
import { openSearchResult } from '@/features/search/state/workflows'
import { cn } from '@/lib/cn'
import { formatConversationTime } from '@/lib/formatConversationTime'
import { highlightMatch } from '@/lib/highlightMatch'
import type { MessageId } from '@/types/ids'

const MessageResult = memo(function MessageResult({
  messageId,
  query,
}: {
  messageId: MessageId
  query: string
}) {
  const dispatch = useAppDispatch()
  const view = useAppSelector((state) => selectMessageSearchResultView(state, messageId))

  if (!view) {
    return null
  }

  return (
    <li>
      <button
        className={cn(listRowClasses, 'flex-col gap-0.5 hover:bg-muted')}
        data-list-item
        onClick={() => {
          void dispatch(openSearchResult(messageId))
        }}
        type="button"
      >
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
            {view.conversationTitle}
          </span>
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={view.sentAt}>
            <ScreenReaderPause />
            {formatConversationTime(view.sentAt)}
          </time>
        </span>
        <span className="truncate text-sm text-muted-foreground">
          <ScreenReaderPause />
          {view.senderLabel}:{' '}
          {highlightMatch(view.text, query).map(({ isMatch, text }) =>
            isMatch ? (
              <mark className="rounded-sm bg-warning text-warning-foreground" key={text}>
                {text}
              </mark>
            ) : (
              text
            ),
          )}
        </span>
      </button>
    </li>
  )
})

export function MessageSearchResults() {
  const dispatch = useAppDispatch()
  const isActive = useAppSelector(selectIsMessageSearchActive)
  const query = useAppSelector(selectConversationSearchQuery).trim()
  const ids = useAppSelector(selectMessageSearchResultIds)
  const status = useAppSelector(selectMessageSearchStatus)
  const error = useAppSelector(selectMessageSearchError)

  if (!isActive) {
    return null
  }

  const isLoading = status === 'idle' || status === 'loading'

  return (
    <section aria-labelledby="message-results-heading" className="mt-3">
      <h2
        className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
        id="message-results-heading"
      >
        Messages
      </h2>

      <p aria-live="polite" className="sr-only" role="status">
        {isLoading ? '' : `${String(ids.length)} messages found`}
      </p>

      {isLoading && ids.length === 0 ? (
        <div aria-busy="true" aria-label="Searching messages" className="flex flex-col gap-2 px-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ) : null}

      {status === 'failed' ? (
        <ErrorRetry
          className="items-start px-3"
          message={error?.message}
          onRetry={() => {
            void dispatch(searchMessages(query))
          }}
        />
      ) : null}

      {status === 'succeeded' && ids.length === 0 ? (
        <p className="px-3 text-sm text-muted-foreground">No messages match "{query}"</p>
      ) : null}

      {ids.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {ids.map((id) => (
            <MessageResult key={id} messageId={id} query={query} />
          ))}
        </ul>
      ) : null}
    </section>
  )
}
