import { createAsyncThunk, type AsyncThunkPayloadCreator } from '@reduxjs/toolkit'
import { toApiFailure, type ApiFailure } from '@/services/apiError'
import type { ChatApi } from '@/services/chatApi'

export interface ThunkExtra {
  readonly api: ChatApi
}

// RootState and AppDispatch stay out of this config on purpose. Slices depend on thunk
// types, so naming the store's types here would make them refer to themselves.
interface ApiThunkConfig {
  extra: ThunkExtra
  serializedErrorType: ApiFailure
}

/** Creates a thunk whose failures reach reducers as a plain ApiFailure in action.error. */
export function createApiThunk<Returned, Arg = void>(
  type: string,
  payloadCreator: AsyncThunkPayloadCreator<Returned, Arg, ApiThunkConfig>,
) {
  return createAsyncThunk<Returned, Arg, ApiThunkConfig>(type, payloadCreator, {
    serializeError: toApiFailure,
  })
}
