import { useAppDispatch } from '@/app/hooks'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { deleteMessage } from '@/features/messages/state/thunks'
import type { MessageId } from '@/types/ids'

export interface DeleteMessageDialogProps {
  /** The message waiting for confirmation. The dialog is closed when this is null. */
  messageId: MessageId | null
  onClose: () => void
  onCloseAutoFocus: () => void
  onDeleted: () => void
}

export function DeleteMessageDialog({
  messageId,
  onClose,
  onCloseAutoFocus,
  onDeleted,
}: DeleteMessageDialogProps) {
  const dispatch = useAppDispatch()

  return (
    <ConfirmDialog
      confirmLabel="Delete"
      description="It will be removed for everyone in this chat. Replies to it stay, and show that it was deleted."
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
      onConfirm={async () => {
        if (messageId) {
          await dispatch(deleteMessage(messageId)).unwrap()
          onDeleted()
        }
      }}
      open={messageId !== null}
      title="Delete this message?"
    />
  )
}
