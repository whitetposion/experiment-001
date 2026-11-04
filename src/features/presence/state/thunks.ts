import { createApiThunk } from '@/app/createApiThunk'

/** Loads people and their online status together, because neither is useful alone. */
export const fetchDirectory = createApiThunk(
  'presence/fetchDirectory',
  async (_, { extra, signal }) => {
    const [currentUser, users, presence] = await Promise.all([
      extra.api.getCurrentUser({ signal }),
      extra.api.getUsers({ signal }),
      extra.api.getPresence({ signal }),
    ])

    return { currentUser, users, presence }
  },
)
