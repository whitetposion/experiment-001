import {
  createEntityAdapter,
  createSlice,
  isAnyOf,
  type EntityState,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { messageReceived, sendMessage } from '@/features/messages'
import type { ApiFailure } from '@/services/apiError'
import type {
  Conversation,
  ConversationFilter,
  ConversationParticipant,
} from '@/types/conversation'
import { conversationMemberKey, type ConversationId, type MessageId } from '@/types/ids'
import type { RequestStatus } from '@/types/request'
import {
  addGroupMembers,
  fetchConversations,
  markConversationRead,
  removeGroupMember,
} from './thunks'

/** Sorted by activity, so the list order is kept in state and never recomputed by a selector. */
export const conversationsAdapter = createEntityAdapter<Conversation>({
  sortComparer: (first, second) => second.updatedAt.localeCompare(first.updatedAt),
})

export const participantsAdapter = createEntityAdapter<ConversationParticipant, string>({
  selectId: ({ conversationId, userId }) => conversationMemberKey(conversationId, userId),
})

export interface ConversationsState extends EntityState<Conversation, ConversationId> {
  readonly participants: EntityState<ConversationParticipant, string>
  readonly selectedConversationId: ConversationId | null
  /** Where unread messages began when this chat was opened. Reading clears unread at once. */
  readonly unreadMarkerId: MessageId | null
  readonly searchQuery: string
  readonly filter: ConversationFilter
  readonly status: RequestStatus
  readonly error: ApiFailure | null
}

function participantKeysOf(
  participants: ConversationsState['participants'],
  conversationId: ConversationId,
) {
  return participants.ids.filter(
    (key) => participants.entities[key]?.conversationId === conversationId,
  )
}

const initialState: ConversationsState = conversationsAdapter.getInitialState({
  participants: participantsAdapter.getInitialState(),
  selectedConversationId: null,
  unreadMarkerId: null,
  searchQuery: '',
  filter: 'all',
  status: 'idle',
  error: null,
})

export const conversationsSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    conversationSelected(state, action: PayloadAction<ConversationId | null>) {
      state.selectedConversationId = action.payload
      state.unreadMarkerId = null
    },
    unreadMarkerSet(state, action: PayloadAction<MessageId>) {
      state.unreadMarkerId = action.payload
    },
    searchQueryChanged(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload
    },
    filterChanged(state, action: PayloadAction<ConversationFilter>) {
      state.filter = action.payload
    },
    /** The current user is no longer a member, so the conversation leaves their list. */
    conversationLeft(state, action: PayloadAction<ConversationId>) {
      const conversationId = action.payload
      const keys = participantKeysOf(state.participants, conversationId)

      conversationsAdapter.removeOne(state, conversationId)
      participantsAdapter.removeMany(state.participants, keys)

      if (state.selectedConversationId === conversationId) {
        state.selectedConversationId = null
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.status = 'succeeded'
        conversationsAdapter.setAll(state, action.payload.conversations)
        participantsAdapter.setAll(state.participants, action.payload.participants)
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.status = action.meta.aborted ? 'idle' : 'failed'
        state.error = action.meta.aborted ? null : action.error
      })
      .addCase(markConversationRead.fulfilled, (state, action) => {
        const { conversation, participant } = action.payload

        // Only the fields this request owns. A slower response must not undo a newer message.
        conversationsAdapter.updateOne(state, {
          id: conversation.id,
          changes: { unread: conversation.unread },
        })
        participantsAdapter.setOne(state.participants, participant)
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { conversationId, createdAt, id } = action.payload

        conversationsAdapter.updateOne(state, {
          id: conversationId,
          changes: { lastMessageId: id, updatedAt: createdAt },
        })
      })
      .addCase(messageReceived, (state, action) => {
        const { conversationId, createdAt, id } = action.payload
        const conversation = state.entities[conversationId]

        if (!conversation) {
          return
        }

        const isOpen = state.selectedConversationId === conversationId
        const { count, firstUnreadMessageId } = conversation.unread

        conversationsAdapter.updateOne(state, {
          id: conversationId,
          changes: {
            lastMessageId: id,
            updatedAt: createdAt,
            unread: isOpen
              ? conversation.unread
              : { count: count + 1, firstUnreadMessageId: firstUnreadMessageId ?? id },
          },
        })
      })
      .addMatcher(
        isAnyOf(addGroupMembers.fulfilled, removeGroupMember.fulfilled),
        (state, action) => {
          const { conversation, participants } = action.payload
          const keys = participantKeysOf(state.participants, conversation.id)

          conversationsAdapter.updateOne(state, {
            id: conversation.id,
            changes: { participantIds: conversation.participantIds },
          })
          participantsAdapter.removeMany(state.participants, keys)
          participantsAdapter.addMany(state.participants, participants)
        },
      )
  },
})

export const {
  conversationLeft,
  conversationSelected,
  filterChanged,
  searchQueryChanged,
  unreadMarkerSet,
} = conversationsSlice.actions
