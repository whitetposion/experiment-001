import { useAppSelector } from '@/app/hooks'
import { AppShell } from '@/components/layout/AppShell'
import {
  ConversationPlaceholder,
  ConversationSidebar,
  selectSelectedConversationId,
} from '@/features/conversations'

export function App() {
  const selectedId = useAppSelector(selectSelectedConversationId)

  return (
    <AppShell
      isMainActive={selectedId !== null}
      main={<ConversationPlaceholder />}
      mainLabel="Conversation"
      sidebar={<ConversationSidebar />}
      title="Chats"
    />
  )
}
