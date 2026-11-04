import { fetchConversations } from '@/features/conversations'
import { fetchDirectory } from '@/features/presence'
import type { AppThunk } from './hooks'

/** Loads what the first screen needs. Each request reports its own status and errors. */
export function bootstrapApp(): AppThunk<Promise<void>> {
  return async (dispatch) => {
    await Promise.all([dispatch(fetchDirectory()), dispatch(fetchConversations())])
  }
}
