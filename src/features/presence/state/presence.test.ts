import { describe, expect, it } from 'vitest'
import { TEST_NOW, createTestStore } from '@/test/store'
import { toConversationId, toUserId } from '@/types/ids'
import {
  selectAllUsers,
  selectCurrentUserId,
  selectDirectoryError,
  selectDirectoryStatus,
  selectIsUserOnline,
  selectTypingUserIds,
  selectUserById,
} from './selectors'
import { presenceChanged, typingStarted, typingStopped } from './slice'
import { fetchDirectory } from './thunks'

const rohan = toUserId('user-rohan')
const conversationId = toConversationId('conversation-rohan')
const other = toConversationId('conversation-launch')

const typing = {
  conversationId,
  userId: rohan,
  startedAt: TEST_NOW.toISOString(),
  expiresAt: TEST_NOW.toISOString(),
}

describe('presence', () => {
  it('loads the current user, people and their status', async () => {
    const { store } = createTestStore()

    await store.dispatch(fetchDirectory())

    expect(selectDirectoryStatus(store.getState())).toBe('succeeded')
    expect(selectCurrentUserId(store.getState())).toBe('user-maya')
    expect(selectAllUsers(store.getState())).toHaveLength(10)
    expect(selectUserById(store.getState(), rohan)?.displayName).toBe('Rohan Desai')
    expect(selectIsUserOnline(store.getState(), rohan)).toBe(true)
  })

  it('records a failure', async () => {
    const { api, store } = createTestStore()
    api.failNextRequest()

    await store.dispatch(fetchDirectory())

    expect(selectDirectoryStatus(store.getState())).toBe('failed')
    expect(selectDirectoryError(store.getState())?.code).toBe('network')
  })

  it('updates when someone goes offline', async () => {
    const { store } = createTestStore()
    await store.dispatch(fetchDirectory())

    store.dispatch(presenceChanged({ userId: rohan, status: 'offline', lastSeenAt: null }))

    expect(selectIsUserOnline(store.getState(), rohan)).toBe(false)
  })

  it('tracks typing per conversation', () => {
    const { store } = createTestStore()

    store.dispatch(typingStarted(typing))
    store.dispatch(typingStarted(typing))

    expect(selectTypingUserIds(store.getState(), conversationId)).toEqual([rohan])
    expect(selectTypingUserIds(store.getState(), other)).toEqual([])

    store.dispatch(typingStopped({ conversationId, userId: rohan }))

    expect(selectTypingUserIds(store.getState(), conversationId)).toEqual([])
  })
})
