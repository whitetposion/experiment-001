import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Button } from '@/components/ui/Button'
import {
  selectConversationFilter,
  selectTotalUnreadCount,
} from '@/features/conversations/state/selectors'
import { filterChanged } from '@/features/conversations/state/slice'
import { CONVERSATION_FILTERS, type ConversationFilter } from '@/types/conversation'

const FILTER_LABELS: Record<ConversationFilter, string> = {
  all: 'All',
  unread: 'Unread',
  groups: 'Groups',
}

export function ConversationFilters() {
  const dispatch = useAppDispatch()
  const activeFilter = useAppSelector(selectConversationFilter)
  const unreadCount = useAppSelector(selectTotalUnreadCount)

  return (
    <div aria-label="Filter chats" className="flex gap-2" role="group">
      {CONVERSATION_FILTERS.map((filter) => (
        <Button
          aria-pressed={activeFilter === filter}
          key={filter}
          onClick={() => {
            dispatch(filterChanged(filter))
          }}
          size="sm"
          variant={activeFilter === filter ? 'primary' : 'secondary'}
        >
          {FILTER_LABELS[filter]}
          {filter === 'unread' && unreadCount > 0 ? ` ${String(unreadCount)}` : null}
        </Button>
      ))}
    </div>
  )
}
