import type { AttachmentId, ConversationId, IsoTimestamp, MessageId, UserId } from './ids'

/**
 * The state of a message from its sender's point of view, summarized across recipients.
 * In a group, delivered and read mean every recipient has reached that state.
 */
export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

/** One user's emoji on one message. Each user has at most one reaction per message. */
export interface MessageReaction {
  readonly emoji: string
  readonly userId: UserId
  readonly reactedAt: IsoTimestamp
}

export type MessageAttachmentKind = 'image' | 'file'

interface MessageAttachmentBase {
  readonly id: AttachmentId
  readonly fileName: string
  readonly mimeType: string
  readonly sizeBytes: number
  readonly url: string
}

export interface ImageAttachment extends MessageAttachmentBase {
  readonly kind: 'image'
  readonly width: number
  readonly height: number
}

export interface FileAttachment extends MessageAttachmentBase {
  readonly kind: 'file'
}

export type MessageAttachment = ImageAttachment | FileAttachment

interface MessageBase {
  readonly id: MessageId
  readonly conversationId: ConversationId
  readonly senderId: UserId
  readonly createdAt: IsoTimestamp
  /** A reference, never a copy, so a reply always shows the current state of its parent. */
  readonly replyToMessageId: MessageId | null
  readonly deliveryStatus: MessageDeliveryStatus
}

export interface ActiveMessage extends MessageBase {
  readonly state: 'active'
  readonly text: string
  readonly editedAt: IsoTimestamp | null
  readonly reactions: readonly MessageReaction[]
  readonly attachments: readonly MessageAttachment[]
}

/** Stays in place so replies and conversation previews can still point at it. */
export interface DeletedMessage extends MessageBase {
  readonly state: 'deleted'
  readonly deletedAt: IsoTimestamp
}

export type Message = ActiveMessage | DeletedMessage
