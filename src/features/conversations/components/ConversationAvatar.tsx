import { Users } from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { Avatar, type AvatarProps } from '@/components/ui/Avatar'
import {
  selectConversationAvatarUrl,
  selectConversationById,
  selectConversationTitle,
  selectIsDirectContactOnline,
} from '@/features/conversations/state/selectors'
import { getInitials } from '@/lib/initials'
import type { ConversationId } from '@/types/ids'

export interface ConversationAvatarProps {
  conversationId: ConversationId
  size?: AvatarProps['size']
}

/**
 * Groups show a group icon. Direct conversations show the other person and their status.
 * It is decorative, so the surrounding text must state the name and online status.
 */
export function ConversationAvatar({ conversationId, size = 'lg' }: ConversationAvatarProps) {
  const type = useAppSelector((state) => selectConversationById(state, conversationId)?.type)
  const title = useAppSelector((state) => selectConversationTitle(state, conversationId))
  const src = useAppSelector((state) => selectConversationAvatarUrl(state, conversationId))
  const isOnline = useAppSelector((state) => selectIsDirectContactOnline(state, conversationId))

  return (
    <span className="relative inline-flex shrink-0">
      <Avatar
        alt=""
        fallback={
          type === 'group' ? <Users aria-hidden="true" className="size-1/2" /> : getInitials(title)
        }
        size={size}
        src={src ?? undefined}
      />
      {isOnline ? (
        <span className="absolute right-0 bottom-0 size-3.5 rounded-pill border-2 border-surface bg-success" />
      ) : null}
    </span>
  )
}
