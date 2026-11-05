import { describe, expect, it, vi } from 'vitest'
import { searchQueryChanged } from '@/features/conversations'
import { deleteMessage } from '@/features/messages'
import { createTestStore } from '@/test/store'
import { toMessageId } from '@/types/ids'
import type { ActiveMessage } from '@/types/message'
import {
  selectIsMessageSearchActive,
  selectMessageSearchResultIds,
  selectMessageSearchResultView,
  selectMessageSearchStatus,
} from './selectors'
import { searchMessages } from './thunks'

describe('search state', () => {
  it('keeps only the latest request when two are in flight', async () => {
    const { api, store } = createTestStore()
    const finish: ((messages: ActiveMessage[]) => void)[] = []
    vi.spyOn(api, 'searchMessages').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish.push((messages) => {
            resolve({ messages })
          })
        }),
    )
    const message = (id: string) => ({ id: toMessageId(id), state: 'active' }) as ActiveMessage

    // Neither is aborted, as when "Try again" overlaps a new search.
    const older = store.dispatch(searchMessages('older'))
    const newer = store.dispatch(searchMessages('newer'))

    finish[1]?.([message('message-newer')])
    await newer
    finish[0]?.([message('message-older')])
    await older

    expect(store.getState().search.resultIds).toEqual(['message-newer'])
    expect(selectMessageSearchStatus(store.getState())).toBe('succeeded')
  })

  it('ignores a failure from an older request', async () => {
    const { api, store } = createTestStore()
    const fail: ((reason: Error) => void)[] = []
    const search = vi.spyOn(api, 'searchMessages')

    search.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail.push(reject)
        }),
    )

    const older = store.dispatch(searchMessages('older'))
    await store.dispatch(searchMessages('payments'))

    fail[0]?.(new Error('Offline'))
    await older

    expect(selectMessageSearchStatus(store.getState())).toBe('succeeded')
  })

  it('leaves deleted messages out of the results, so the count stays right', async () => {
    const { store } = createTestStore()
    await store.dispatch(searchMessages('icon'))
    const before = selectMessageSearchResultIds(store.getState())
    const deleted = toMessageId('message-priya-2')
    expect(before).toContain(deleted)

    await store.dispatch(deleteMessage(deleted))

    const after = selectMessageSearchResultIds(store.getState())
    expect(after).toHaveLength(before.length - 1)
    expect(after).not.toContain(deleted)
    expect(selectMessageSearchResultView(store.getState(), deleted)).toBeNull()
  })

  it('keeps the same ID list when an unrelated message changes', async () => {
    const { store } = createTestStore()
    await store.dispatch(searchMessages('icon'))
    const before = selectMessageSearchResultIds(store.getState())

    await store.dispatch(deleteMessage(toMessageId('message-rohan-4')))

    expect(selectMessageSearchResultIds(store.getState())).toBe(before)
  })

  it('resets when the query becomes too short', async () => {
    const { store } = createTestStore()
    store.dispatch(searchQueryChanged('icon'))
    await vi.waitFor(() => {
      expect(selectMessageSearchStatus(store.getState())).toBe('succeeded')
    })
    expect(selectIsMessageSearchActive(store.getState())).toBe(true)

    store.dispatch(searchQueryChanged('i'))

    expect(selectIsMessageSearchActive(store.getState())).toBe(false)
    expect(selectMessageSearchResultIds(store.getState())).toEqual([])
    expect(selectMessageSearchStatus(store.getState())).toBe('idle')
  })
})
