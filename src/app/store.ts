import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { conversationsSlice } from '@/features/conversations'
import { messagesSlice } from '@/features/messages'
import { presenceSlice } from '@/features/presence'
import { searchListenerMiddleware, searchSlice } from '@/features/search'
import { uiSlice } from '@/features/ui'
import type { ChatApi } from '@/services/chatApi'

const rootReducer = combineSlices(
  conversationsSlice,
  messagesSlice,
  presenceSlice,
  searchSlice,
  uiSlice,
)

/** The backend is passed in, so swapping the mock for a real API changes only the caller. */
export function makeStore({ api }: { api: ChatApi }) {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: { api } } }).prepend(searchListenerMiddleware),
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
export type RootState = ReturnType<typeof rootReducer>
