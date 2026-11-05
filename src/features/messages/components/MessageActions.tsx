import { Copy, Ellipsis, Pencil, Reply, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { useAppDispatch } from '@/app/hooks'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuToggleItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { IconButton } from '@/components/ui/IconButton'
import type { ReactionSummary } from '@/features/messages/state/selectors'
import { toggleReaction } from '@/features/messages/state/workflows'
import type { ApiFailure } from '@/services/apiError'
import type { MessageId } from '@/types/ids'

const QUICK_REACTIONS = [
  { emoji: '👍', label: 'thumbs up' },
  { emoji: '❤️', label: 'heart' },
  { emoji: '😂', label: 'laughing' },
  { emoji: '😮', label: 'surprised' },
  { emoji: '😢', label: 'sad' },
  { emoji: '🙏', label: 'thank you' },
]

export interface MessageActionsProps {
  messageId: MessageId
  text: string
  isOwn: boolean
  senderName: string
  reactions: readonly ReactionSummary[]
  onReply: (messageId: MessageId) => void
  onEdit: (messageId: MessageId) => void
  onDelete: (messageId: MessageId) => void
  onNotice: (message: string) => void
}

export function MessageActions({
  isOwn,
  messageId,
  onDelete,
  onEdit,
  onNotice,
  onReply,
  reactions,
  senderName,
  text,
}: MessageActionsProps) {
  const dispatch = useAppDispatch()

  // The menu returns focus to its button as it closes. An action that moves focus elsewhere,
  // to the composer or a dialog, waits for that moment so the two do not fight.
  const afterCloseRef = useRef<(() => void) | null>(null)

  function runAfterClose(action: (id: MessageId) => void) {
    afterCloseRef.current = () => {
      action(messageId)
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text)
      onNotice('Message copied')
    } catch {
      onNotice('Could not copy this message')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
          data-message-actions={messageId}
          label={`Actions for message from ${senderName}`}
          size="sm"
        >
          <Ellipsis aria-hidden="true" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isOwn ? 'end' : 'start'}
        onCloseAutoFocus={(event) => {
          const action = afterCloseRef.current

          if (action) {
            event.preventDefault()
            afterCloseRef.current = null
            action()
          }
        }}
      >
        <DropdownMenuGroup className="flex justify-between gap-0.5">
          {QUICK_REACTIONS.map(({ emoji, label }) => (
            <DropdownMenuToggleItem
              aria-label={`React with ${label}`}
              checked={reactions.some(
                (reaction) => reaction.emoji === emoji && reaction.reactedByCurrentUser,
              )}
              key={emoji}
              onCheckedChange={() => {
                dispatch(toggleReaction({ messageId, emoji })).catch((failure: unknown) => {
                  onNotice((failure as ApiFailure).message)
                })
              }}
            >
              {emoji}
            </DropdownMenuToggleItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            runAfterClose(onReply)
          }}
        >
          <Reply aria-hidden="true" /> Reply
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            void copyText()
          }}
        >
          <Copy aria-hidden="true" /> Copy
        </DropdownMenuItem>
        {isOwn ? (
          <>
            <DropdownMenuItem
              onSelect={() => {
                runAfterClose(onEdit)
              }}
            >
              <Pencil aria-hidden="true" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                runAfterClose(onDelete)
              }}
              variant="destructive"
            >
              <Trash2 aria-hidden="true" /> Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
