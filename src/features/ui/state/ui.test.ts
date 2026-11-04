import { describe, expect, it } from 'vitest'
import { conversationSelected } from '@/features/conversations'
import { deleteMessage, editMessage, sendMessage } from '@/features/messages'
import { createTestStore } from '@/test/store'
import { toConversationId, toMessageId } from '@/types/ids'
import { selectComposerTarget, selectIsDetailsPanelOpen } from './selectors'
import { composerTargetChanged, detailsPanelToggled } from './slice'

const conversationId = toConversationId('conversation-rohan')
const messageId = toMessageId('message-rohan-4')
const reply = { mode: 'reply', messageId } as const

describe('ui', () => {
  it('resets panel and composer when the conversation changes', () => {
    const { store } = createTestStore()
    store.dispatch(detailsPanelToggled(true))
    store.dispatch(composerTargetChanged(reply))

    store.dispatch(conversationSelected(conversationId))

    expect(selectIsDetailsPanelOpen(store.getState())).toBe(false)
    expect(selectComposerTarget(store.getState())).toBeNull()
  })

  it('clears the reply target after sending', async () => {
    const { store } = createTestStore()
    store.dispatch(composerTargetChanged(reply))

    await store.dispatch(sendMessage({ conversationId, text: 'Sent' }))

    expect(selectComposerTarget(store.getState())).toBeNull()
  })

  it('keeps the reply target when sending fails, so the user can retry', async () => {
    const { api, store } = createTestStore()
    store.dispatch(composerTargetChanged(reply))
    api.failNextRequest()

    await store.dispatch(sendMessage({ conversationId, text: 'Lost' }))

    expect(selectComposerTarget(store.getState())).toEqual(reply)
  })

  it('clears the edit target after saving', async () => {
    const { store } = createTestStore()
    store.dispatch(composerTargetChanged({ mode: 'edit', messageId }))

    await store.dispatch(editMessage({ messageId, text: 'Saved' }))

    expect(selectComposerTarget(store.getState())).toBeNull()
  })

  it('clears the target only when that message is deleted', async () => {
    const { store } = createTestStore()
    store.dispatch(composerTargetChanged(reply))

    await store.dispatch(deleteMessage(toMessageId('message-rohan-2')))
    expect(selectComposerTarget(store.getState())).toEqual(reply)

    await store.dispatch(deleteMessage(messageId))
    expect(selectComposerTarget(store.getState())).toBeNull()
  })
})
