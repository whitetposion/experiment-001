import { createEntityAdapter, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ApiFailure } from '@/services/apiError'
import type { ConversationId, UserId } from '@/types/ids'
import type { TypingIndicator, UserPresence } from '@/types/presence'
import type { RequestStatus } from '@/types/request'
import type { User } from '@/types/user'
import { fetchDirectory } from './thunks'

export const usersAdapter = createEntityAdapter<User>()

export const presenceAdapter = createEntityAdapter<UserPresence, UserId>({
  selectId: ({ userId }) => userId,
})

export const typingKey = (conversationId: ConversationId, userId: UserId) =>
  `${conversationId}:${userId}`

export const typingAdapter = createEntityAdapter<TypingIndicator, string>({
  selectId: ({ conversationId, userId }) => typingKey(conversationId, userId),
})

export interface PresenceState {
  readonly currentUserId: UserId | null
  readonly users: ReturnType<typeof usersAdapter.getInitialState>
  readonly statuses: ReturnType<typeof presenceAdapter.getInitialState>
  readonly typing: ReturnType<typeof typingAdapter.getInitialState>
  readonly status: RequestStatus
  readonly error: ApiFailure | null
}

const initialState: PresenceState = {
  currentUserId: null,
  users: usersAdapter.getInitialState(),
  statuses: presenceAdapter.getInitialState(),
  typing: typingAdapter.getInitialState(),
  status: 'idle',
  error: null,
}

export const presenceSlice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    presenceChanged(state, action: PayloadAction<UserPresence>) {
      presenceAdapter.setOne(state.statuses, action.payload)
    },
    typingStarted(state, action: PayloadAction<TypingIndicator>) {
      typingAdapter.setOne(state.typing, action.payload)
    },
    typingStopped(
      state,
      action: PayloadAction<{ conversationId: ConversationId; userId: UserId }>,
    ) {
      const { conversationId, userId } = action.payload
      typingAdapter.removeOne(state.typing, typingKey(conversationId, userId))
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDirectory.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchDirectory.fulfilled, (state, action) => {
        const { currentUser, presence, users } = action.payload
        state.status = 'succeeded'
        state.currentUserId = currentUser.id
        usersAdapter.setAll(state.users, users)
        presenceAdapter.setAll(state.statuses, presence)
      })
      .addCase(fetchDirectory.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error
      })
  },
})

export const { presenceChanged, typingStarted, typingStopped } = presenceSlice.actions
