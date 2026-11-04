import { combineSlices, configureStore } from '@reduxjs/toolkit'

// Register each feature slice here, for example combineSlices(messagesSlice).
const rootReducer = combineSlices()

export function makeStore() {
  return configureStore({ reducer: rootReducer })
}

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
// eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- empty until the first slice is registered
export type RootState = ReturnType<typeof rootReducer>
