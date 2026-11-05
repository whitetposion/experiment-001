import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimedNotice } from './useTimedNotice'

describe('useTimedNotice', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a notice and clears it after the duration', () => {
    const { result } = renderHook(() => useTimedNotice(1000))

    act(() => {
      result.current.showNotice('Copied')
    })
    expect(result.current.notice).toBe('Copied')

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.notice).toBeNull()
  })

  it('restarts the timer for a new notice', () => {
    const { result } = renderHook(() => useTimedNotice(1000))

    act(() => {
      result.current.showNotice('First')
      vi.advanceTimersByTime(900)
      result.current.showNotice('Second')
      vi.advanceTimersByTime(900)
    })

    expect(result.current.notice).toBe('Second')
  })

  it('keeps showNotice stable between renders', () => {
    const { rerender, result } = renderHook(() => useTimedNotice())
    const first = result.current.showNotice

    rerender()

    expect(result.current.showNotice).toBe(first)
  })

  it('clears its timer when unmounted', () => {
    const { result, unmount } = renderHook(() => useTimedNotice())

    act(() => {
      result.current.showNotice('Copied')
    })
    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
