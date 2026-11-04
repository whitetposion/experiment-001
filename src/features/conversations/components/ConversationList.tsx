import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  selectConversationCount,
  selectConversationFilter,
  selectConversationSearchQuery,
  selectConversationsError,
  selectConversationsStatus,
  selectVisibleConversationIds,
} from '@/features/conversations/state/selectors'
import { filterChanged, searchQueryChanged } from '@/features/conversations/state/slice'
import { fetchConversations } from '@/features/conversations/state/thunks'
import { ConversationItem } from './ConversationItem'

const SKELETON_ROWS = [1, 2, 3, 4, 5, 6]

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading chats" className="flex flex-col" role="status">
      {SKELETON_ROWS.map((row) => (
        <div className="flex items-center gap-3 px-3 py-2" key={row}>
          <Skeleton className="size-12 shrink-0 rounded-pill" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ListMessage({
  action,
  description,
  title,
}: {
  action?: React.ReactNode
  description: string
  title: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-section text-center">
      <div className="flex flex-col gap-1">
        <p className="font-semibold tracking-tight">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

function EmptyResults() {
  const dispatch = useAppDispatch()
  const query = useAppSelector(selectConversationSearchQuery).trim()
  const filter = useAppSelector(selectConversationFilter)
  const total = useAppSelector(selectConversationCount)

  if (total === 0) {
    return <ListMessage description="Your conversations will appear here." title="No chats yet" />
  }

  if (query) {
    return (
      <ListMessage
        action={
          <Button
            onClick={() => {
              dispatch(searchQueryChanged(''))
            }}
            size="sm"
            variant="secondary"
          >
            Clear search
          </Button>
        }
        description="Check the spelling, or search by a person's or group's name."
        title={`No chats match "${query}"`}
      />
    )
  }

  return (
    <ListMessage
      action={
        <Button
          onClick={() => {
            dispatch(filterChanged('all'))
          }}
          size="sm"
          variant="secondary"
        >
          Show all chats
        </Button>
      }
      description={
        filter === 'unread' ? 'You have read every message.' : 'You are not in any groups.'
      }
      title={filter === 'unread' ? 'No unread chats' : 'No groups'}
    />
  )
}

export function ConversationList() {
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectConversationsStatus)
  const error = useAppSelector(selectConversationsError)
  const ids = useAppSelector(selectVisibleConversationIds)

  if (status === 'idle' || status === 'loading') {
    return <ListSkeleton />
  }

  if (status === 'failed') {
    return (
      <div role="alert">
        <ListMessage
          action={
            <Button
              onClick={() => {
                void dispatch(fetchConversations())
              }}
              size="sm"
              variant="secondary"
            >
              Try again
            </Button>
          }
          description={error?.message ?? 'Something went wrong. Try again.'}
          title="Could not load your chats"
        />
      </div>
    )
  }

  if (ids.length === 0) {
    return <EmptyResults />
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {ids.map((id) => (
        <ConversationItem conversationId={id} key={id} />
      ))}
    </ul>
  )
}
