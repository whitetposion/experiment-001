declare const brand: unique symbol

type Brand<Value, Name extends string> = Value & { readonly [brand]: Name }

// IDs are plain strings at runtime. The brand makes passing a ConversationId where a
// UserId belongs a compile error.
export type UserId = Brand<string, 'UserId'>
export type ConversationId = Brand<string, 'ConversationId'>
export type MessageId = Brand<string, 'MessageId'>
export type AttachmentId = Brand<string, 'AttachmentId'>

/** An ISO 8601 string. Dates stay as strings so that state and mock data remain serializable. */
export type IsoTimestamp = string

export const toUserId = (value: string) => value as UserId
export const toConversationId = (value: string) => value as ConversationId
export const toMessageId = (value: string) => value as MessageId
export const toAttachmentId = (value: string) => value as AttachmentId

/** Identifies one person in one conversation, such as a membership or a typing indicator. */
export const conversationMemberKey = (conversationId: ConversationId, userId: UserId) =>
  `${conversationId}:${userId}`
