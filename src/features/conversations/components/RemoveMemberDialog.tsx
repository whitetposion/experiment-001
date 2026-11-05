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
import type { GroupMemberView } from '@/features/conversations/state/selectors'
import { removeGroupMember } from '@/features/conversations/state/thunks'
import type { ApiFailure } from '@/services/apiError'
import type { ConversationId } from '@/types/ids'

export interface RemoveMemberDialogProps {
  conversationId: ConversationId
  groupName: string
  /** The member waiting for confirmation. The dialog is closed when this is null. */
  member: GroupMemberView | null
  onClose: () => void
  onCloseAutoFocus: () => void
}

export function RemoveMemberDialog({
  conversationId,
  groupName,
  member,
  onClose,
  onCloseAutoFocus,
}: RemoveMemberDialogProps) {
  const dispatch = useAppDispatch()
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    setError(null)
    onClose()
  }

  async function confirm() {
    if (!member) {
      return
    }

    setIsRemoving(true)
    setError(null)

    try {
      await dispatch(removeGroupMember({ conversationId, userId: member.userId })).unwrap()
      close()
    } catch (failure) {
      setError((failure as ApiFailure).message)
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          close()
        }
      }}
      open={member !== null}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onCloseAutoFocus()
        }}
        size="sm"
      >
        <DialogHeader>
          <DialogTitle>Remove {member?.name}?</DialogTitle>
          <DialogDescription>
            They will leave {groupName}. Their earlier messages stay in the chat, and you can add
            them back later.
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
            loading={isRemoving}
            onClick={() => {
              void confirm()
            }}
            variant="destructive"
          >
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
