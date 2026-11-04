import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'

export type { AppDispatch, RootState }

// Features import from this file, never from ./store. It only imports types from
// the store, so slices can use it without creating a runtime cycle.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
