import { MessagesSquare } from 'lucide-react'
import { useEffect, useRef, type RefObject } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  GroupInfoPanel,
  selectConversationById,
  selectSelectedConversationId,
  selectUnreadMarkerId,
} from '@/features/conversations'
import { MessageList } from '@/features/messages'
import {
  composerTargetChanged,
  detailsPanelToggled,
  messageHighlighted,
  selectHighlightedMessageId,
  selectIsDetailsPanelOpen,
} from '@/features/ui'
import { isCoarsePointer } from '@/lib/pointer'
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

const HIGHLIGHT_MS = 2500

interface ChatMessagesProps {
  conversationId: ConversationId
  showSender: boolean
  onReply: (messageId: MessageId) => void
  onEdit: (messageId: MessageId) => void
}

/** Subscribes on its own, so a highlight does not re-render the whole chat. */
function ChatMessages(props: ChatMessagesProps) {
  const dispatch = useAppDispatch()
  const highlightedMessageId = useAppSelector(selectHighlightedMessageId)
  const unreadMarkerId = useAppSelector(selectUnreadMarkerId)

  useEffect(() => {
    if (!highlightedMessageId) {
      return undefined
    }

    const timer = setTimeout(() => {
      dispatch(messageHighlighted(null))
    }, HIGHLIGHT_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [dispatch, highlightedMessageId])

  return (
    <MessageList
      {...props}
      highlightedMessageId={highlightedMessageId}
      unreadMarkerId={unreadMarkerId}
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

  // Ready to type on opening. A touch screen would pop up its keyboard, so it waits for a tap.
  useEffect(() => {
    if (!isCoarsePointer()) {
      inputRef.current?.focus()
    }
  }, [])

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
      <ChatMessages
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
