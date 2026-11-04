import { createApiThunk } from '@/app/createApiThunk'
import type { EditMessageRequest, ReactionRequest, SendMessageRequest } from '@/services/chatApi'
import type { ConversationId, MessageId } from '@/types/ids'

export interface FetchMessagesRequest {
  readonly conversationId: ConversationId
  /** Loads the page before this message. Omit it for the newest page. */
  readonly before?: MessageId
}

export const fetchMessages = createApiThunk(
  'messages/fetch',
  ({ before, conversationId }: FetchMessagesRequest, { extra, signal }) =>
    extra.api.getMessages(conversationId, { signal, ...(before ? { before } : {}) }),
)

export const sendMessage = createApiThunk(
  'messages/send',
  (request: SendMessageRequest, { extra }) => extra.api.sendMessage(request),
)

export const editMessage = createApiThunk(
  'messages/edit',
  (request: EditMessageRequest, { extra }) => extra.api.editMessage(request),
)

export const deleteMessage = createApiThunk('messages/delete', (messageId: MessageId, { extra }) =>
  extra.api.deleteMessage(messageId),
)

export const addReaction = createApiThunk(
  'messages/addReaction',
  (request: ReactionRequest, { extra }) => extra.api.addReaction(request),
)

export const removeReaction = createApiThunk(
  'messages/removeReaction',
  (request: ReactionRequest, { extra }) => extra.api.removeReaction(request),
)
