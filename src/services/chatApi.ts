import type { Conversation, ConversationParticipant, GroupConversation } from '@/types/conversation'
import type { ConversationId, MessageId, UserId } from '@/types/ids'
import type { ActiveMessage, DeletedMessage, Message, MessageDeliveryStatus } from '@/types/message'
import type { TypingIndicator, UserPresence } from '@/types/presence'
import type { User } from '@/types/user'

export interface RequestOptions {
  signal?: AbortSignal
}

export interface GetMessagesOptions extends RequestOptions {
  /** Returns the messages just before this one. Omit it for the newest messages. */
  before?: MessageId
  limit?: number
}

export interface ConversationListResponse {
  /** Most recently active first. */
  readonly conversations: readonly Conversation[]
  readonly participants: readonly ConversationParticipant[]
  /** The messages that conversation previews reference through lastMessageId. */
  readonly lastMessages: readonly Message[]
}

export interface MessagePageResponse {
  /** Oldest first, ready to render. */
  readonly messages: readonly Message[]
  readonly hasMore: boolean
}

export interface GroupMembersResponse {
  readonly conversation: GroupConversation
  /** Every participant after the change. */
  readonly participants: readonly ConversationParticipant[]
}

export interface SendMessageRequest {
  readonly conversationId: ConversationId
  readonly text: string
  readonly replyToMessageId?: MessageId
}

export interface EditMessageRequest {
  readonly messageId: MessageId
  readonly text: string
}

export interface ReactionRequest {
  readonly messageId: MessageId
  readonly emoji: string
}

export interface MarkConversationReadResponse {
  readonly conversation: Conversation
  readonly participant: ConversationParticipant
}

export interface AddGroupMembersRequest {
  readonly conversationId: ConversationId
  readonly userIds: readonly UserId[]
}

export interface RemoveGroupMemberRequest {
  readonly conversationId: ConversationId
  readonly userId: UserId
}

/** Something that happened on the server. A real backend would push these over a WebSocket. */
export type ChatEvent =
  | { readonly type: 'message-received'; readonly message: Message }
  | {
      readonly type: 'message-status-changed'
      readonly messageId: MessageId
      readonly status: MessageDeliveryStatus
    }
  | { readonly type: 'presence-changed'; readonly presence: UserPresence }
  | { readonly type: 'typing-started'; readonly indicator: TypingIndicator }
  | {
      readonly type: 'typing-stopped'
      readonly conversationId: ConversationId
      readonly userId: UserId
    }

export type ChatEventListener = (event: ChatEvent) => void

/**
 * Everything the application needs from a backend. Failures reject with an ApiError.
 * Message operations take a conversation or message ID, so they work the same for direct
 * and group conversations. A real backend replaces the mock by implementing this interface.
 */
export interface ChatApi {
  getCurrentUser(options?: RequestOptions): Promise<User>
  getUsers(options?: RequestOptions): Promise<readonly User[]>
  getPresence(options?: RequestOptions): Promise<readonly UserPresence[]>
  getConversations(options?: RequestOptions): Promise<ConversationListResponse>
  getMessages(
    conversationId: ConversationId,
    options?: GetMessagesOptions,
  ): Promise<MessagePageResponse>
  sendMessage(request: SendMessageRequest): Promise<ActiveMessage>
  editMessage(request: EditMessageRequest): Promise<ActiveMessage>
  deleteMessage(messageId: MessageId): Promise<DeletedMessage>
  /** Each user has one reaction per message, so this replaces any previous one. */
  addReaction(request: ReactionRequest): Promise<ActiveMessage>
  removeReaction(request: ReactionRequest): Promise<ActiveMessage>
  markConversationRead(conversationId: ConversationId): Promise<MarkConversationReadResponse>
  addGroupMembers(request: AddGroupMembersRequest): Promise<GroupMembersResponse>
  removeGroupMember(request: RemoveGroupMemberRequest): Promise<GroupMembersResponse>
  /** Starts receiving live events, and returns the function that stops them. */
  subscribe(listener: ChatEventListener): () => void
}
