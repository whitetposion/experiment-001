import {
  createListenerMiddleware,
  createSlice,
  type ThunkDispatch,
  type UnknownAction,
} from '@reduxjs/toolkit'
import type { ThunkExtra } from '@/app/createApiThunk'
import { searchQueryChanged } from '@/features/conversations'
import type { ApiFailure } from '@/services/apiError'
import type { MessageId } from '@/types/ids'
import type { RequestStatus } from '@/types/request'
import { searchMessages } from './thunks'

/** Shorter queries match too much to be useful. */
export const MIN_QUERY_LENGTH = 2

export interface SearchState {
  readonly resultIds: readonly MessageId[]
  readonly status: RequestStatus
  readonly error: ApiFailure | null
  /** The latest request. A response from any other is out of date. */
  readonly currentRequestId: string | null
}

const initialState: SearchState = {
  resultIds: [],
  status: 'idle',
  error: null,
  currentRequestId: null,
}

export const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(searchQueryChanged, (state, action) => {
        if (action.payload.trim().length < MIN_QUERY_LENGTH) {
          return initialState
        }

        return state
      })
      .addCase(searchMessages.pending, (state, action) => {
        state.status = 'loading'
        state.error = null
        state.currentRequestId = action.meta.requestId
      })
      .addCase(searchMessages.fulfilled, (state, action) => {
        if (state.currentRequestId === action.meta.requestId) {
          state.status = 'succeeded'
          state.resultIds = action.payload
        }
      })
      .addCase(searchMessages.rejected, (state, action) => {
        if (state.currentRequestId === action.meta.requestId && !action.meta.aborted) {
          state.status = 'failed'
          state.error = action.error
        }
      })
  },
})

const listener = createListenerMiddleware<
  unknown,
  ThunkDispatch<unknown, ThunkExtra, UnknownAction>
>()

export const searchListenerMiddleware = listener.middleware

// Reacts to the settled query, because the search box debounces before it reaches Redux.
listener.startListening({
  actionCreator: searchQueryChanged,
  effect: async (action, listenerApi) => {
    listenerApi.cancelActiveListeners()

    const query = action.payload.trim()

    if (query.length >= MIN_QUERY_LENGTH) {
      const request = listenerApi.dispatch(searchMessages(query))

      listenerApi.signal.addEventListener('abort', () => {
        request.abort()
      })

      await request
    }
  },
})
