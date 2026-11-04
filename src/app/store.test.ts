import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addGroupMembers,
  openConversation,
  selectAllConversations,
  selectConversationsStatus,
} from '@/features/conversations'
import { addReaction, deleteMessage, editMessage, sendMessage } from '@/features/messages'
import { selectDirectoryStatus } from '@/features/presence'
import { createTestStore } from '@/test/store'
import { toConversationId, toMessageId, toUserId } from '@/types/ids'
import { bootstrapApp } from './bootstrap'

describe('store', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('has one state domain per feature, and none for groups', () => {
    expect(Object.keys(createTestStore().store.getState()).sort()).toEqual([
      'conversations',
      'messages',
      'presence',
      'ui',
    ])
  })

  it('loads everything the first screen needs', async () => {
    const { store } = createTestStore()

    await store.dispatch(bootstrapApp())

    expect(selectDirectoryStatus(store.getState())).toBe('succeeded')
    expect(selectConversationsStatus(store.getState())).toBe('succeeded')
    expect(selectAllConversations(store.getState())).toHaveLength(9)
  })

  it('shows one failed area while the other still loads', async () => {
    const { api, store } = createTestStore()
    api.failNextRequest()

    await store.dispatch(bootstrapApp())

    const statuses = [
      selectDirectoryStatus(store.getState()),
      selectConversationsStatus(store.getState()),
    ]
    expect(statuses.toSorted()).toEqual(['failed', 'succeeded'])
  })

  it('runs a full session with no Redux or selector warnings', async () => {
    const error = vi.spyOn(console, 'error')
    const warn = vi.spyOn(console, 'warn')
    const { store } = createTestStore()
    const conversationId = toConversationId('conversation-launch')
    const messageId = toMessageId('message-launch-30')

    await store.dispatch(bootstrapApp())
    await store.dispatch(openConversation(conversationId))
    await store.dispatch(sendMessage({ conversationId, text: 'Hello' }))
    await store.dispatch(editMessage({ messageId, text: 'Edited' }))
    await store.dispatch(addReaction({ messageId, emoji: '🎉' }))
    await store.dispatch(deleteMessage(messageId))
    await store.dispatch(addGroupMembers({ conversationId, userIds: [toUserId('user-sara')] }))

    expect(error).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })

  it('keeps state serializable', async () => {
    const { api, store } = createTestStore()
    api.failNextRequest()

    await store.dispatch(bootstrapApp())
    await store.dispatch(openConversation(toConversationId('conversation-rohan')))

    expect(structuredClone(store.getState())).toEqual(store.getState())
    expect(JSON.parse(JSON.stringify(store.getState()))).toEqual(store.getState())
  })
})
