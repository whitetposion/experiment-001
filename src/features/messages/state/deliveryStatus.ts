import type { MessageDeliveryStatus } from '@/types/message'

const ALLOWED_NEXT: Record<MessageDeliveryStatus, readonly MessageDeliveryStatus[]> = {
  sending: ['sent', 'delivered', 'read', 'failed'],
  sent: ['delivered', 'read'],
  delivered: ['read'],
  read: [],
  failed: ['sending'],
}

/** Status events can arrive late or out of order, so a message must never move backwards. */
export function canChangeDeliveryStatus(
  current: MessageDeliveryStatus,
  next: MessageDeliveryStatus,
) {
  return ALLOWED_NEXT[current].includes(next)
}
