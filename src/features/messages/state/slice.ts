import {
  createEntityAdapter,
  createSlice,
  isAnyOf,
  type EntityState,
  type PayloadAction,
} from '@reduxjs/toolkit'
import type { ApiFailure } from '@/services/apiError'
import type { ConversationId, MessageId } from '@/types/ids'
import type { Message, MessageDeliveryStatus } from '@/types/message'
import type { RequestStatus } from '@/types/request'
import { canChangeDeliveryStatus } from './deliveryStatus'
import {
  addReaction,
  deleteMessage,
  editMessage,
  fetchMessages,
  removeReaction,
  sendMessage,
} from './thunks'

export const messagesAdapter = createEntityAdapter<Message>()

/** The loaded messages of one conversation, in display order. */
export interface MessageThread {
  readonly ids: readonly MessageId[]
  readonly hasMore: boolean
  readonly status: RequestStatus
  readonly error: ApiFailure | null
}

export interface MessagesState extends EntityState<Message, MessageId> {
  readonly threads: Partial<Record<ConversationId, MessageThread>>
}

export const EMPTY_THREAD: MessageThread = { ids: [], hasMore: false, status: 'idle', error: null }

const initialState: MessagesState = messagesAdapter.getInitialState({ threads: {} })

function updateThread(
  state: { threads: Partial<Record<ConversationId, MessageThread>> },
  conversationId: ConversationId,
  changes: Partial<MessageThread>,
) {
  state.threads[conversationId] = {
    ...(state.threads[conversationId] ?? EMPTY_THREAD),
    ...changes,
  }
}

function appendToThread(state: MessagesState, message: Message) {
  const { ids } = state.threads[message.conversationId] ?? EMPTY_THREAD

  if (!ids.includes(message.id)) {
    updateThread(state, message.conversationId, { ids: [...ids, message.id] })
  }
}

export const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    /** Stores messages without placing them in a thread, such as conversation previews. */
    messagesReceived(state, action: PayloadAction<readonly Message[]>) {
      messagesAdapter.upsertMany(state, action.payload)
    },
    /** A new message from someone else. */
    messageReceived(state, action: PayloadAction<Message>) {
      messagesAdapter.upsertOne(state, action.payload)
      appendToThread(state, action.payload)
    },
    messageStatusChanged(
      state,
      action: PayloadAction<{ messageId: MessageId; status: MessageDeliveryStatus }>,
    ) {
      const { messageId, status } = action.payload
      const message = state.entities[messageId]

      if (message && canChangeDeliveryStatus(message.deliveryStatus, status)) {
        message.deliveryStatus = status
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state, action) => {
        updateThread(state, action.meta.arg.conversationId, { status: 'loading', error: null })
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { before, conversationId } = action.meta.arg
        const { hasMore, messages } = action.payload
        const pageIds = messages.map(({ id }) => id)
        const { ids } = state.threads[conversationId] ?? EMPTY_THREAD

        // Anything already in the thread stays, because a message sent or received while
        // this request was in flight is missing from its response.
        const newIds = pageIds.filter((id) => !ids.includes(id))
        const knownIds = ids.filter((id) => !pageIds.includes(id))

        messagesAdapter.upsertMany(state, messages)
        updateThread(state, conversationId, {
          ids: before ? [...newIds, ...ids] : [...pageIds, ...knownIds],
          hasMore,
          status: 'succeeded',
        })
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        // A cancelled request is not a failure the user needs to see.
        updateThread(state, action.meta.arg.conversationId, {
          status: action.meta.aborted ? 'idle' : 'failed',
          error: action.meta.aborted ? null : action.error,
        })
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        messagesAdapter.setOne(state, action.payload)
        appendToThread(state, action.payload)
      })
      .addMatcher(
        isAnyOf(
          editMessage.fulfilled,
          deleteMessage.fulfilled,
          addReaction.fulfilled,
          removeReaction.fulfilled,
        ),
        (state, action) => {
          messagesAdapter.setOne(state, action.payload)
        },
      )
  },
})

export const { messageReceived, messagesReceived, messageStatusChanged } = messagesSlice.actions
