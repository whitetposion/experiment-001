import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { focusConversationSearch } from './focus'
import { ConversationFilters } from './ConversationFilters'
import { ConversationList } from './ConversationList'
import { ConversationSearch } from './ConversationSearch'
import { UserProfileHeader } from './UserProfileHeader'

export interface ConversationSidebarProps {
  /** Message results, supplied by the app because the search feature builds on this one. */
  searchResults?: ReactNode
}

export function ConversationSidebar({ searchResults }: ConversationSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null)

  const listItems = () => [
    ...(listRef.current?.querySelectorAll<HTMLElement>('[data-list-item]') ?? []),
  ]

  /** Arrow keys move between rows. The list stays one Tab stop away from everything else. */
  function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = listItems()
    const index = items.indexOf(event.target as HTMLElement)

    if (index === -1) {
      return
    }

    const nextByKey: Partial<Record<string, HTMLElement | undefined>> = {
      ArrowDown: items[index + 1],
      ArrowUp: items[index - 1],
      Home: items[0],
      End: items.at(-1),
    }

    if (event.key in nextByKey) {
      event.preventDefault()

      if (event.key === 'ArrowUp' && index === 0) {
        focusConversationSearch()
      } else {
        nextByKey[event.key]?.focus()
      }
    }
  }

  return (
    <nav
      aria-label="Chats"
      className="flex h-full flex-col border-border bg-surface backdrop-blur-surface md:border-r"
    >
      <div className="flex flex-col gap-3 p-gutter pb-3">
        <UserProfileHeader />
        <ConversationSearch
          onExit={() => {
            listItems()[0]?.focus()
          }}
        />
        <ConversationFilters />
      </div>
      <div
        // relative keeps absolutely positioned screen reader text inside this scroller.
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2"
        onKeyDown={handleListKeyDown}
        ref={listRef}
        role="presentation"
      >
        <ConversationList />
        {searchResults}
      </div>
    </nav>
  )
}
