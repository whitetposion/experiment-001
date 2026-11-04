import { Check, CheckCheck, CircleAlert, Clock, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { MessageDeliveryStatus } from '@/types/message'

const STATUSES: Record<MessageDeliveryStatus, { icon: LucideIcon; label: string }> = {
  sending: { icon: Clock, label: 'Sending' },
  sent: { icon: Check, label: 'Sent' },
  delivered: { icon: CheckCheck, label: 'Delivered' },
  read: { icon: CheckCheck, label: 'Read' },
  failed: { icon: CircleAlert, label: 'Failed to send' },
}

export interface MessageStatusIndicatorProps {
  status: MessageDeliveryStatus
  /** The color for read messages, which depends on the surface behind the icon. */
  readClassName: string
}

export function MessageStatusIndicator({ readClassName, status }: MessageStatusIndicatorProps) {
  const { icon: Icon, label } = STATUSES[status]

  return (
    <span className="inline-flex shrink-0">
      <Icon
        aria-hidden="true"
        className={cn(
          'size-4',
          status === 'read' && readClassName,
          status === 'failed' && 'text-destructive',
        )}
      />
      <span className="sr-only">{label}, </span>
    </span>
  )
}
