import { toMessageId, toUserId, type ConversationId } from '@/types/ids'
import type { ActiveMessage } from '@/types/message'
import { TEST_NOW } from './store'

/** A message from someone else, as a live event would deliver it. */
export function incomingMessage(
  conversationId: ConversationId,
  id: string,
  overrides: Partial<ActiveMessage> = {},
): ActiveMessage {
  return {
    id: toMessageId(id),
    conversationId,
    senderId: toUserId('user-rohan'),
    createdAt: TEST_NOW.toISOString(),
    replyToMessageId: null,
    deliveryStatus: 'delivered',
    state: 'active',
    text: 'Incoming',
    editedAt: null,
    reactions: [],
    attachments: [],
    ...overrides,
  }
}
