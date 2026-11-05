import { Check, SendHorizontal, X } from 'lucide-react'
import { useState, type KeyboardEvent, type Ref, type SubmitEvent } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { FormError } from '@/components/ui/FormError'
import { IconButton } from '@/components/ui/IconButton'
import { Textarea } from '@/components/ui/Textarea'
import { editMessage, selectMessageView, sendMessage } from '@/features/messages'
import { composerTargetChanged, selectComposerTarget } from '@/features/ui'
import { getFailureMessage } from '@/lib/failureMessage'
import { isCoarsePointer } from '@/lib/pointer'
import type { ConversationId, MessageId } from '@/types/ids'

function ComposerBanner({
  cancelLabel,
  onCancel,
  text,
  title,
}: {
  cancelLabel: string
  onCancel: () => void
  text: string
  title: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border-l-2 border-primary bg-muted py-1 pr-1 pl-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="truncate text-muted-foreground">{text}</p>
      </div>
      <IconButton label={cancelLabel} onClick={onCancel} size="sm">
        <X aria-hidden="true" />
      </IconButton>
    </div>
  )
}

interface EditDraft {
  readonly messageId: MessageId
  readonly text: string
}

export interface MessageComposerProps {
  conversationId: ConversationId
  /** Lets the chat window move focus here when a reply or edit starts. */
  inputRef: Ref<HTMLTextAreaElement>
}

export function MessageComposer({ conversationId, inputRef }: MessageComposerProps) {
  const dispatch = useAppDispatch()
  const target = useAppSelector(selectComposerTarget)
  const targetView = useAppSelector((state) =>
    target ? selectMessageView(state, target.messageId, undefined) : null,
  )
  const [draft, setDraft] = useState('')
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targetText = targetView?.message.state === 'active' ? targetView.message.text : ''
  const isEditing = target?.mode === 'edit'
  const replyToMessageId = target?.mode === 'reply' ? target.messageId : undefined

  // Derived, so starting an edit needs no effect and the unsent draft is untouched.
  const text = isEditing
    ? editDraft?.messageId === target.messageId
      ? editDraft.text
      : targetText
    : draft
  const canSubmit = text.trim().length > 0

  function changeText(value: string) {
    if (isEditing) {
      setEditDraft({ messageId: target.messageId, text: value })
    } else {
      setDraft(value)
    }
  }

  function cancelTarget() {
    setEditDraft(null)
    setError(null)
    dispatch(composerTargetChanged(null))
  }

  async function saveEdit(messageId: MessageId) {
    if (text.trim() === targetText) {
      cancelTarget()
      return
    }

    await dispatch(editMessage({ messageId, text })).unwrap()
    setEditDraft(null)
  }

  async function send() {
    const sentText = text

    await dispatch(
      sendMessage({
        conversationId,
        text: sentText,
        ...(replyToMessageId ? { replyToMessageId } : {}),
      }),
    ).unwrap()

    // Keeps anything typed while the message was on its way.
    setDraft((current) => (current === sentText ? '' : current))
  }

  async function submit() {
    if (!canSubmit || isBusy) {
      return
    }

    setIsBusy(true)
    setError(null)

    try {
      await (isEditing ? saveEdit(target.messageId) : send())
    } catch (failure) {
      setError(getFailureMessage(failure))
    } finally {
      setIsBusy(false)
    }
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    void submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape' && target) {
      event.preventDefault()
      cancelTarget()
    }

    // isComposing is true while an input method is confirming text, such as Japanese.
    // On a touch screen, Return adds a line and the send button sends.
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      !isCoarsePointer()
    ) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <form className="flex flex-col gap-2 p-2 md:px-gutter md:py-3" onSubmit={handleSubmit}>
      {isEditing ? (
        <ComposerBanner
          cancelLabel="Cancel edit"
          onCancel={cancelTarget}
          text={targetText}
          title="Editing message"
        />
      ) : null}
      {replyToMessageId ? (
        <ComposerBanner
          cancelLabel="Cancel reply"
          onCancel={cancelTarget}
          text={targetText}
          title={`Replying to ${targetView?.senderName ?? 'message'}`}
        />
      ) : null}
      {error ? <FormError className="px-2">{error}</FormError> : null}
      <div className="flex items-end gap-2">
        <Textarea
          aria-label={isEditing ? 'Edit message' : 'Message'}
          autoResize
          className="max-h-40"
          onChange={(event) => {
            changeText(event.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          ref={inputRef}
          rows={1}
          value={text}
        />
        <IconButton
          disabled={!canSubmit}
          label={isEditing ? 'Save edit' : 'Send message'}
          loading={isBusy}
          type="submit"
          variant="primary"
        >
          {isEditing ? <Check aria-hidden="true" /> : <SendHorizontal aria-hidden="true" />}
        </IconButton>
      </div>
    </form>
  )
}
