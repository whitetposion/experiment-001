import { Search, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { selectConversationSearchQuery } from '@/features/conversations/state/selectors'
import { searchQueryChanged } from '@/features/conversations/state/slice'

export function ConversationSearch() {
  const dispatch = useAppDispatch()
  const query = useAppSelector(selectConversationSearchQuery)

  return (
    <div className="relative" role="search">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label="Search chats"
        className="pr-11 pl-10 [&::-webkit-search-cancel-button]:appearance-none"
        onChange={(event) => {
          dispatch(searchQueryChanged(event.target.value))
        }}
        placeholder="Search"
        type="search"
        value={query}
      />
      {query ? (
        <IconButton
          className="absolute top-1/2 right-1 -translate-y-1/2"
          label="Clear search"
          onClick={() => {
            dispatch(searchQueryChanged(''))
          }}
          size="sm"
        >
          <X aria-hidden="true" />
        </IconButton>
      ) : null}
    </div>
  )
}
