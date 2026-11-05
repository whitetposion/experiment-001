import { MessagesSquare } from 'lucide-react'
import { useRef, type RefObject } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  GroupInfoPanel,
  selectConversationById,
  selectSelectedConversationId,
} from '@/features/conversations'
import { MessageList } from '@/features/messages'
import { composerTargetChanged, detailsPanelToggled, selectIsDetailsPanelOpen } from '@/features/ui'
import type { ConversationId, MessageId } from '@/types/ids'
import { ChatHeader } from './ChatHeader'
import { MessageComposer } from './MessageComposer'

/** Subscribes on its own, so opening the panel does not re-render the conversation. */
function ConversationDetails({
  conversationId,
  returnFocusRef,
}: {
  conversationId: ConversationId
  returnFocusRef: RefObject<HTMLButtonElement | null>
}) {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector(selectIsDetailsPanelOpen)

  return (
    <GroupInfoPanel
      conversationId={conversationId}
      onCloseAutoFocus={() => {
        returnFocusRef.current?.focus()
      }}
      onOpenChange={(open) => {
        dispatch(detailsPanelToggled(open))
      }}
      open={isOpen}
    />
  )
}

function ActiveChat({ conversationId }: { conversationId: ConversationId }) {
  const dispatch = useAppDispatch()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const infoButtonRef = useRef<HTMLButtonElement>(null)
  const isGroup = useAppSelector(
    (state) => selectConversationById(state, conversationId)?.type === 'group',
  )

  function handleReply(messageId: MessageId) {
    dispatch(composerTargetChanged({ mode: 'reply', messageId }))
    inputRef.current?.focus()
  }

  function handleEdit(messageId: MessageId) {
    dispatch(composerTargetChanged({ mode: 'edit', messageId }))
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader conversationId={conversationId} infoButtonRef={infoButtonRef} />
      <MessageList
        conversationId={conversationId}
        onEdit={handleEdit}
        onReply={handleReply}
        showSender={isGroup}
      />
      <MessageComposer conversationId={conversationId} inputRef={inputRef} />
      <ConversationDetails conversationId={conversationId} returnFocusRef={infoButtonRef} />
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
