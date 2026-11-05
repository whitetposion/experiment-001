import { useState } from 'react'
import { useAppDispatch } from '@/app/hooks'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { deleteMessage } from '@/features/messages/state/thunks'
import type { ApiFailure } from '@/services/apiError'
import type { MessageId } from '@/types/ids'

export interface DeleteMessageDialogProps {
  /** The message waiting for confirmation. The dialog is closed when this is null. */
  messageId: MessageId | null
  onClose: () => void
  onCloseAutoFocus: () => void
}

export function DeleteMessageDialog({
  messageId,
  onClose,
  onCloseAutoFocus,
}: DeleteMessageDialogProps) {
  const dispatch = useAppDispatch()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    setError(null)
    onClose()
  }

  async function confirm() {
    if (!messageId) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      await dispatch(deleteMessage(messageId)).unwrap()
      close()
    } catch (failure) {
      setError((failure as ApiFailure).message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          close()
        }
      }}
      open={messageId !== null}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onCloseAutoFocus()
        }}
        size="sm"
      >
        <DialogHeader>
          <DialogTitle>Delete this message?</DialogTitle>
          <DialogDescription>
            It will be removed for everyone in this chat. Replies to it stay, and show that it was
            deleted.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button
            loading={isDeleting}
            onClick={() => {
              void confirm()
            }}
            variant="destructive"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
