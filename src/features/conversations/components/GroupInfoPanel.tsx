import { UserMinus, UserPlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useAppSelector } from '@/app/hooks'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { IconButton } from '@/components/ui/IconButton'
import { OnlineDot } from '@/components/ui/OnlineDot'
import { Separator } from '@/components/ui/Separator'
import {
  selectCanManageMembers,
  selectConversationById,
  selectGroupCreatorName,
  selectGroupMembers,
  type GroupMemberView,
} from '@/features/conversations/state/selectors'
import { useTimedNotice } from '@/hooks/useTimedNotice'
import { countLabel } from '@/lib/countLabel'
import { formatLastSeen } from '@/lib/formatConversationTime'
import { formatFullDate } from '@/lib/formatMessageDate'
import { getInitials } from '@/lib/initials'
import type { ConversationId, UserId } from '@/types/ids'
import { AddMembersForm } from './AddMembersForm'
import { ConversationAvatar } from './ConversationAvatar'
import { RemoveMemberDialog } from './RemoveMemberDialog'

const ROLE_BADGES = {
  owner: { label: 'Owner', variant: 'primary' },
  admin: { label: 'Admin', variant: 'secondary' },
} as const

function memberStatus({ isOnline, lastSeenAt }: GroupMemberView) {
  if (isOnline) {
    return 'Online'
  }

  return lastSeenAt ? formatLastSeen(lastSeenAt) : 'Offline'
}

function MemberRow({
  member,
  onRemove,
}: {
  member: GroupMemberView
  onRemove: (userId: UserId) => void
}) {
  const badge = member.role === 'member' ? null : ROLE_BADGES[member.role]

  return (
    <li className="flex min-h-control items-center gap-3 py-1">
      <span className="relative inline-flex shrink-0">
        <Avatar alt="" fallback={getInitials(member.name)} />
        {member.isOnline ? <OnlineDot className="size-3 border-surface-elevated" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.name}
          {member.isCurrentUser ? ' (you)' : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">{memberStatus(member)}</p>
      </div>
      {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
      {member.canRemove ? (
        <IconButton
          data-remove-member={member.userId}
          label={`Remove ${member.name}`}
          onClick={() => {
            onRemove(member.userId)
          }}
          size="sm"
        >
          <UserMinus aria-hidden="true" />
        </IconButton>
      ) : null}
    </li>
  )
}

export interface GroupInfoPanelProps {
  conversationId: ConversationId
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The panel opens from elsewhere and has no trigger, so the caller decides where focus goes. */
  onCloseAutoFocus: () => void
}

/** Group details and members. Direct conversations have nothing to show here. */
export function GroupInfoPanel({
  conversationId,
  onCloseAutoFocus,
  onOpenChange,
  open,
}: GroupInfoPanelProps) {
  const conversation = useAppSelector((state) => selectConversationById(state, conversationId))
  const members = useAppSelector((state) => selectGroupMembers(state, conversationId))
  const canManage = useAppSelector((state) => selectCanManageMembers(state, conversationId))
  const creatorName = useAppSelector((state) => selectGroupCreatorName(state, conversationId))
  const { notice, showNotice } = useTimedNotice()
  const [isAdding, setIsAdding] = useState(false)
  const [hasReturnedFromAdding, setHasReturnedFromAdding] = useState(false)
  const [pendingRemovalId, setPendingRemovalId] = useState<UserId | null>(null)
  const lastRemovalIdRef = useRef<UserId | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)

  if (conversation?.type !== 'group') {
    return null
  }

  const pendingMember = members.find(({ userId }) => userId === pendingRemovalId) ?? null

  /** Back to the member's remove button, or the add button if they have gone. */
  function restoreFocusAfterRemoval() {
    const target = lastRemovalIdRef.current
    const button =
      target && panelRef.current?.querySelector<HTMLElement>(`[data-remove-member="${target}"]`)

    ;(button ?? addButtonRef.current)?.focus()
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setIsAdding(false)
        setHasReturnedFromAdding(false)
        onOpenChange(nextOpen)
      }}
      open={open}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onCloseAutoFocus()
        }}
        placement="right"
        ref={panelRef}
      >
        <DialogTitle>Group info</DialogTitle>
        <DialogDescription className="sr-only">
          Details and members of {conversation.name}
        </DialogDescription>

        <section aria-label="About this group" className="flex flex-col items-center gap-2">
          <ConversationAvatar conversationId={conversationId} size="xl" />
          <h3 className="text-center font-heading text-xl font-semibold tracking-tight wrap-anywhere">
            {conversation.name}
          </h3>
          <p className="text-center text-sm whitespace-pre-wrap text-muted-foreground">
            {conversation.description ?? 'No description'}
          </p>
          {creatorName ? (
            <p className="text-center text-xs text-muted-foreground">
              Created by {creatorName} on {formatFullDate(conversation.createdAt)}
            </p>
          ) : null}
        </section>

        <Separator />

        <section aria-labelledby="group-members-heading" className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold tracking-tight" id="group-members-heading">
              {countLabel(members.length, 'member')}
            </h3>
            {canManage && !isAdding ? (
              <Button
                autoFocus={hasReturnedFromAdding}
                onClick={() => {
                  setIsAdding(true)
                }}
                ref={addButtonRef}
                size="sm"
                variant="secondary"
              >
                <UserPlus aria-hidden="true" /> Add members
              </Button>
            ) : null}
          </div>

          <p className="min-h-4 text-xs text-muted-foreground" role="status">
            {notice}
          </p>

          {isAdding ? (
            <AddMembersForm
              conversationId={conversationId}
              onAdded={(count) => {
                showNotice(`Added ${countLabel(count, 'person', 'people')}`)
              }}
              onDone={() => {
                setIsAdding(false)
                setHasReturnedFromAdding(true)
              }}
            />
          ) : (
            <ul className="flex flex-col">
              {members.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  onRemove={(userId) => {
                    lastRemovalIdRef.current = userId
                    setPendingRemovalId(userId)
                  }}
                />
              ))}
            </ul>
          )}
        </section>

        <RemoveMemberDialog
          conversationId={conversationId}
          groupName={conversation.name}
          member={pendingMember}
          onClose={() => {
            setPendingRemovalId(null)
          }}
          onCloseAutoFocus={restoreFocusAfterRemoval}
          onRemoved={(name) => {
            showNotice(`Removed ${name}`)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
