import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedCallback } from './useDebouncedCallback'

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls once, with the latest value, after the input settles', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 100))

    act(() => {
      result.current.run('a')
      vi.advanceTimersByTime(99)
      result.current.run('ab')
      vi.advanceTimersByTime(99)
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith('ab')
  })

  it('can be cancelled', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 100))

    act(() => {
      result.current.run('a')
      result.current.cancel()
      vi.advanceTimersByTime(200)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('uses the newest callback without restarting the wait', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender, result } = renderHook(({ callback }) => useDebouncedCallback(callback, 100), {
      initialProps: { callback: first },
    })

    act(() => {
      result.current.run('a')
    })
    rerender({ callback: second })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith('a')
  })

  it('keeps run stable between renders', () => {
    const { rerender, result } = renderHook(() => useDebouncedCallback(vi.fn(), 100))
    const { run } = result.current

    rerender()

    expect(result.current.run).toBe(run)
  })

  it('leaves no timer after unmounting', () => {
    const callback = vi.fn()
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 100))

    act(() => {
      result.current.run('a')
    })
    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
