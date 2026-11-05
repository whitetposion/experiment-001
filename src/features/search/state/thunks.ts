import { createApiThunk } from '@/app/createApiThunk'
import { messagesReceived } from '@/features/messages'

export const searchMessages = createApiThunk(
  'search/messages',
  async (query: string, { dispatch, extra, signal }) => {
    const { messages } = await extra.api.searchMessages(query, { signal })

    // Results live with every other message, so edits and deletes reach them too.
    dispatch(messagesReceived(messages))

    return messages.map(({ id }) => id)
  },
)
