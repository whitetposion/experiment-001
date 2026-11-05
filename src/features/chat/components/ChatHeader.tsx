import { ArrowLeft, Info } from 'lucide-react'
import type { Ref } from 'react'
import { flushSync } from 'react-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { IconButton } from '@/components/ui/IconButton'
import {
  ConversationAvatar,
  conversationSelected,
  focusConversationRow,
  selectConversationById,
  selectConversationSubtitle,
  selectConversationTitle,
  selectTypingLabel,
} from '@/features/conversations'
import { detailsPanelToggled } from '@/features/ui'
import type { ConversationId } from '@/types/ids'

export interface ChatHeaderProps {
  conversationId: ConversationId
  /** Lets focus return here when the group panel closes. */
  infoButtonRef: Ref<HTMLButtonElement>
}

export function ChatHeader({ conversationId, infoButtonRef }: ChatHeaderProps) {
  const dispatch = useAppDispatch()
  const title = useAppSelector((state) => selectConversationTitle(state, conversationId))
  const subtitle = useAppSelector((state) => selectConversationSubtitle(state, conversationId))
  const typingLabel = useAppSelector((state) => selectTypingLabel(state, conversationId))
  const isGroup = useAppSelector(
    (state) => selectConversationById(state, conversationId)?.type === 'group',
  )

  return (
    <header className="flex min-h-control items-center gap-2 border-b bg-surface px-2 py-2 backdrop-blur-surface md:gap-3 md:px-gutter">
      <IconButton
        className="md:hidden"
        label="Back to chats"
        onClick={() => {
          // The row is hidden until this renders, and it needs to be visible to take focus.
          flushSync(() => {
            dispatch(conversationSelected(null))
          })
          focusConversationRow(conversationId)
        }}
      >
        <ArrowLeft aria-hidden="true" />
      </IconButton>
      <ConversationAvatar conversationId={conversationId} size="md" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-semibold tracking-tight">{title}</h2>
        {(typingLabel ?? subtitle) ? (
          <p className="truncate text-xs text-muted-foreground">{typingLabel ?? subtitle}</p>
        ) : null}
      </div>
      {isGroup ? (
        <IconButton
          label="Group info"
          onClick={() => {
            dispatch(detailsPanelToggled(true))
          }}
          ref={infoButtonRef}
        >
          <Info aria-hidden="true" />
        </IconButton>
      ) : null}
    </header>
  )
}
