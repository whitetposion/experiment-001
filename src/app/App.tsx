import { useEffect } from 'react'
import { connectChatEvents } from '@/app/chatEvents'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useConversationBackNavigation } from '@/app/useConversationBackNavigation'
import { useGlobalShortcuts } from '@/app/useGlobalShortcuts'
import { AppShell } from '@/components/layout/AppShell'
import { ChatWindow } from '@/features/chat'
import {
  ConversationSidebar,
  selectSelectedConversationId,
  selectTotalUnreadCount,
} from '@/features/conversations'
import { MessageSearchResults } from '@/features/search'

const APP_TITLE = 'Chats'

/** Its own component, so a changing unread count does not re-render the whole app. */
function DocumentTitle() {
  const unreadCount = useAppSelector(selectTotalUnreadCount)

  useEffect(() => {
    document.title = unreadCount > 0 ? `(${String(unreadCount)}) ${APP_TITLE}` : APP_TITLE
  }, [unreadCount])

  return null
}

export function App() {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector(selectSelectedConversationId)

  // An external subscription, which is what effects are for. Its cleanup stops every timer.
  useEffect(() => dispatch(connectChatEvents()), [dispatch])
  useGlobalShortcuts()
  useConversationBackNavigation()

  return (
    <>
      <DocumentTitle />
      <AppShell
        isMainActive={selectedId !== null}
        main={<ChatWindow />}
        mainLabel="Conversation"
        sidebar={<ConversationSidebar searchResults={<MessageSearchResults />} />}
        title={APP_TITLE}
      />
    </>
  )
}
