import { MessagesSquare } from 'lucide-react'
import { useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { selectConversationById, selectSelectedConversationId } from '@/features/conversations'
import { MessageList } from '@/features/messages'
import { composerTargetChanged } from '@/features/ui'
import type { ConversationId, MessageId } from '@/types/ids'
import { ChatHeader } from './ChatHeader'
import { MessageComposer } from './MessageComposer'

function ActiveChat({ conversationId }: { conversationId: ConversationId }) {
  const dispatch = useAppDispatch()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isGroup = useAppSelector(
    (state) => selectConversationById(state, conversationId)?.type === 'group',
  )

  function handleReply(messageId: MessageId) {
    dispatch(composerTargetChanged({ mode: 'reply', messageId }))
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader conversationId={conversationId} />
      <MessageList conversationId={conversationId} onReply={handleReply} showSender={isGroup} />
      <MessageComposer conversationId={conversationId} inputRef={inputRef} />
    </div>
  )
}

/** One window for every conversation. The type only decides whether senders are named. */
export function ChatWindow() {
  const selectedId = useAppSelector(selectSelectedConversationId)

  if (!selectedId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-gutter text-center">
        <MessagesSquare aria-hidden="true" className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Select a chat to start messaging.</p>
      </div>
    )
  }

  // The key resets scroll position and the draft for each conversation.
  return <ActiveChat conversationId={selectedId} key={selectedId} />
}
