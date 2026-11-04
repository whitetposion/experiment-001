import { ConversationFilters } from './ConversationFilters'
import { ConversationList } from './ConversationList'
import { ConversationSearch } from './ConversationSearch'
import { UserProfileHeader } from './UserProfileHeader'

export function ConversationSidebar() {
  return (
    <nav
      aria-label="Chats"
      className="flex h-full flex-col border-border bg-surface backdrop-blur-surface md:border-r"
    >
      <div className="flex flex-col gap-3 p-gutter pb-3">
        <UserProfileHeader />
        <ConversationSearch />
        <ConversationFilters />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        <ConversationList />
      </div>
    </nav>
  )
}
