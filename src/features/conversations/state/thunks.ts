import { createApiThunk } from '@/app/createApiThunk'
import { messagesReceived } from '@/features/messages'
import type { AddGroupMembersRequest, RemoveGroupMemberRequest } from '@/services/chatApi'
import type { ConversationId } from '@/types/ids'

export const fetchConversations = createApiThunk(
  'conversations/fetch',
  async (_, { dispatch, extra, signal }) => {
    const response = await extra.api.getConversations({ signal })

    // Previews live with the other messages. Sending them first means a conversation
    // never appears with a lastMessageId that points at nothing.
    dispatch(messagesReceived(response.lastMessages))

    return response
  },
)

export const markConversationRead = createApiThunk(
  'conversations/markRead',
  (conversationId: ConversationId, { extra }) => extra.api.markConversationRead(conversationId),
)

export const addGroupMembers = createApiThunk(
  'conversations/addGroupMembers',
  (request: AddGroupMembersRequest, { extra }) => extra.api.addGroupMembers(request),
)

export const removeGroupMember = createApiThunk(
  'conversations/removeGroupMember',
  (request: RemoveGroupMemberRequest, { extra }) => extra.api.removeGroupMember(request),
)
