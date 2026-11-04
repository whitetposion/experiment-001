import { createSelector, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import type { ThunkExtra } from './createApiThunk'
import type { AppDispatch, RootState } from './store'

export type { AppDispatch, RootState }

/** A thunk that coordinates other actions. Declare its return type to keep inference simple. */
export type AppThunk<Result = void> = ThunkAction<Result, RootState, ThunkExtra, UnknownAction>

// Features import from this file, never from ./store. It only imports types from
// the store, so slices can use it without creating a runtime cycle.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
export const createAppSelector = createSelector.withTypes<RootState>()
