import { SendHorizontal, X } from 'lucide-react'
import { useState, type KeyboardEvent, type Ref, type SubmitEvent } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { IconButton } from '@/components/ui/IconButton'
import { Textarea } from '@/components/ui/Textarea'
import { selectMessageView, sendMessage } from '@/features/messages'
import { composerTargetChanged, selectComposerTarget } from '@/features/ui'
import type { ApiFailure } from '@/services/apiError'
import type { ConversationId, MessageId } from '@/types/ids'

function ReplyBanner({ messageId }: { messageId: MessageId }) {
  const dispatch = useAppDispatch()
  const view = useAppSelector((state) => selectMessageView(state, messageId, undefined))
  const text = view?.message.state === 'active' ? view.message.text : ''

  return (
    <div className="flex items-center gap-2 rounded-md border-l-2 border-primary bg-muted py-1 pr-1 pl-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">Replying to {view?.senderName}</p>
        <p className="truncate text-muted-foreground">{text}</p>
      </div>
      <IconButton
        label="Cancel reply"
        onClick={() => {
          dispatch(composerTargetChanged(null))
        }}
        size="sm"
      >
        <X aria-hidden="true" />
      </IconButton>
    </div>
  )
}

export interface MessageComposerProps {
  conversationId: ConversationId
  /** Lets the chat window move focus here when a reply starts. */
  inputRef: Ref<HTMLTextAreaElement>
}

export function MessageComposer({ conversationId, inputRef }: MessageComposerProps) {
  const dispatch = useAppDispatch()
  const target = useAppSelector(selectComposerTarget)
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const replyToMessageId = target?.mode === 'reply' ? target.messageId : undefined
  const canSend = text.trim().length > 0

  async function send() {
    if (!canSend || isSending) {
      return
    }

    const sentText = text
    setIsSending(true)
    setError(null)

    try {
      await dispatch(
        sendMessage({
          conversationId,
          text: sentText,
          ...(replyToMessageId ? { replyToMessageId } : {}),
        }),
      ).unwrap()

      // Keeps anything typed while the message was on its way.
      setText((current) => (current === sentText ? '' : current))
    } catch (failure) {
      setError((failure as ApiFailure).message)
    } finally {
      setIsSending(false)
    }
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    void send()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // isComposing is true while an input method is confirming text, such as Japanese.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send()
    }
  }

  return (
    <form className="flex flex-col gap-2 p-2 md:px-gutter md:py-3" onSubmit={handleSubmit}>
      {replyToMessageId ? <ReplyBanner messageId={replyToMessageId} /> : null}
      {error ? (
        <p className="px-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <Textarea
          aria-label="Message"
          autoResize
          className="max-h-40"
          onChange={(event) => {
            setText(event.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          ref={inputRef}
          rows={1}
          value={text}
        />
        <IconButton
          disabled={!canSend}
          label="Send message"
          loading={isSending}
          type="submit"
          variant="primary"
        >
          <SendHorizontal aria-hidden="true" />
        </IconButton>
      </div>
    </form>
  )
}
