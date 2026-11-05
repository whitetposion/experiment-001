import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit'
import { conversationSelected } from '@/features/conversations'
import { deleteMessage, editMessage, sendMessage } from '@/features/messages'
import type { MessageId } from '@/types/ids'

/** What the composer is working on. One value, because replying and editing exclude each other. */
export interface ComposerTarget {
  readonly mode: 'reply' | 'edit'
  readonly messageId: MessageId
}

export interface UiState {
  readonly isDetailsPanelOpen: boolean
  readonly composerTarget: ComposerTarget | null
  /** A message to scroll to and briefly highlight, such as a search result. */
  readonly highlightedMessageId: MessageId | null
}

const initialState: UiState = {
  isDetailsPanelOpen: false,
  composerTarget: null,
  highlightedMessageId: null,
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    detailsPanelToggled(state, action: PayloadAction<boolean>) {
      state.isDetailsPanelOpen = action.payload
    },
    composerTargetChanged(state, action: PayloadAction<ComposerTarget | null>) {
      state.composerTarget = action.payload
    },
    messageHighlighted(state, action: PayloadAction<MessageId | null>) {
      state.highlightedMessageId = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(conversationSelected, (state) => {
        state.isDetailsPanelOpen = false
        state.composerTarget = null
        state.highlightedMessageId = null
      })
      .addCase(deleteMessage.fulfilled, (state, action) => {
        if (state.composerTarget?.messageId === action.payload.id) {
          state.composerTarget = null
        }
      })
      .addMatcher(isAnyOf(sendMessage.fulfilled, editMessage.fulfilled), (state) => {
        state.composerTarget = null
      })
  },
})

export const { composerTargetChanged, detailsPanelToggled, messageHighlighted } = uiSlice.actions
