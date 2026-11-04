import { ArrowLeft } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { IconButton } from '@/components/ui/IconButton'
import {
  ConversationAvatar,
  conversationSelected,
  selectConversationSubtitle,
  selectConversationTitle,
} from '@/features/conversations'
import type { ConversationId } from '@/types/ids'

export function ChatHeader({ conversationId }: { conversationId: ConversationId }) {
  const dispatch = useAppDispatch()
  const title = useAppSelector((state) => selectConversationTitle(state, conversationId))
  const subtitle = useAppSelector((state) => selectConversationSubtitle(state, conversationId))

  return (
    <header className="flex min-h-control items-center gap-2 border-b bg-surface px-2 py-2 backdrop-blur-surface md:gap-3 md:px-gutter">
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
      <div className="min-w-0">
        <h2 className="truncate font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </header>
  )
}
