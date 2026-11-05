import { Search, X } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { selectConversationSearchQuery } from '@/features/conversations/state/selectors'
import { searchQueryChanged } from '@/features/conversations/state/slice'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'
import { conversationSearchInputId } from './focus'

const DEBOUNCE_MS = 250

export interface ConversationSearchProps {
  /** Moves into the results below, for the Down Arrow key. */
  onExit: () => void
}

export function ConversationSearch({ onExit }: ConversationSearchProps) {
  const dispatch = useAppDispatch()
  const query = useAppSelector(selectConversationSearchQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  // Holds what is being typed until the search settles. Derived this way, a query cleared
  // from elsewhere shows up here without an effect to keep the two in sync.
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? query

  const { cancel, run } = useDebouncedCallback((nextQuery: string) => {
    dispatch(searchQueryChanged(nextQuery))
    setDraft(null)
  }, DEBOUNCE_MS)

  function clear() {
    cancel()
    setDraft(null)
    dispatch(searchQueryChanged(''))
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && value) {
      event.preventDefault()
      clear()
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      onExit()
    }
  }

  return (
    <div className="relative" role="search">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-keyshortcuts="Control+K Meta+K /"
        aria-label="Search chats and messages"
        className="pr-11 pl-10 [&::-webkit-search-cancel-button]:appearance-none"
        id={conversationSearchInputId}
        onChange={(event) => {
          setDraft(event.target.value)
          run(event.target.value)
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search"
        ref={inputRef}
        type="search"
        value={value}
      />
      {value ? (
        <IconButton
          className="absolute top-1/2 right-1 -translate-y-1/2"
          label="Clear search"
          onClick={clear}
          size="sm"
        >
          <X aria-hidden="true" />
        </IconButton>
      ) : null}
    </div>
  )
}
