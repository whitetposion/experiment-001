import { ArrowLeft, MessagesSquare } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { IconButton } from '@/components/ui/IconButton'
import {
  selectConversationTitle,
  selectSelectedConversationId,
} from '@/features/conversations/state/selectors'
import { conversationSelected } from '@/features/conversations/state/slice'
import type { ConversationId } from '@/types/ids'
import { ConversationAvatar } from './ConversationAvatar'

function SelectedHeader({ conversationId }: { conversationId: ConversationId }) {
  const dispatch = useAppDispatch()
  const title = useAppSelector((state) => selectConversationTitle(state, conversationId))

  return (
    <header className="flex min-h-control items-center gap-2 border-b px-2 py-2 md:px-gutter">
      <IconButton
        className="md:hidden"
        label="Back to chats"
        onClick={() => {
          dispatch(conversationSelected(null))
        }}
      >
        <ArrowLeft aria-hidden="true" />
      </IconButton>
      <ConversationAvatar conversationId={conversationId} size="md" />
      <h2 className="min-w-0 truncate font-semibold tracking-tight">{title}</h2>
    </header>
  )
}

/** Holds the main panel until the message window exists. */
export function ConversationPlaceholder() {
  const selectedId = useAppSelector(selectSelectedConversationId)

  return (
    <div className="flex h-full flex-col">
      {selectedId ? <SelectedHeader conversationId={selectedId} /> : null}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-gutter text-center">
        <MessagesSquare aria-hidden="true" className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {selectedId ? 'Messages will appear here.' : 'Select a chat to start messaging.'}
        </p>
      </div>
    </div>
  )
}
