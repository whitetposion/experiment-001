import { useAppSelector } from '@/app/hooks'
import { AppShell } from '@/components/layout/AppShell'
import { ChatWindow } from '@/features/chat'
import { ConversationSidebar, selectSelectedConversationId } from '@/features/conversations'

export function App() {
  const selectedId = useAppSelector(selectSelectedConversationId)

  return (
    <AppShell
      isMainActive={selectedId !== null}
      main={<ChatWindow />}
      mainLabel="Conversation"
      sidebar={<ConversationSidebar />}
      title="Chats"
    />
  )
}
