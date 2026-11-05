import { useEffect } from 'react'
import { connectChatEvents } from '@/app/chatEvents'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { AppShell } from '@/components/layout/AppShell'
import { ChatWindow } from '@/features/chat'
import { ConversationSidebar, selectSelectedConversationId } from '@/features/conversations'

export function App() {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector(selectSelectedConversationId)

  // An external subscription, which is what effects are for. Its cleanup stops every timer.
  useEffect(() => dispatch(connectChatEvents()), [dispatch])

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
