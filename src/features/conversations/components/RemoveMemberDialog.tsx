import { useAppDispatch } from '@/app/hooks'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { GroupMemberView } from '@/features/conversations/state/selectors'
import { removeGroupMember } from '@/features/conversations/state/thunks'
import type { ConversationId } from '@/types/ids'

export interface RemoveMemberDialogProps {
  conversationId: ConversationId
  groupName: string
  /** The member waiting for confirmation. The dialog is closed when this is null. */
  member: GroupMemberView | null
  onClose: () => void
  onCloseAutoFocus: () => void
  onRemoved: (name: string) => void
}

export function RemoveMemberDialog({
  conversationId,
  groupName,
  member,
  onClose,
  onCloseAutoFocus,
  onRemoved,
}: RemoveMemberDialogProps) {
  const dispatch = useAppDispatch()

  return (
    <ConfirmDialog
      confirmLabel="Remove"
      description={`They will leave ${groupName}. Their earlier messages stay in the chat, and you can add them back later.`}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
      onConfirm={async () => {
        if (member) {
          await dispatch(removeGroupMember({ conversationId, userId: member.userId })).unwrap()
          onRemoved(member.name)
        }
      }}
      open={member !== null}
      title={<>Remove {member?.name}?</>}
    />
  )
}
