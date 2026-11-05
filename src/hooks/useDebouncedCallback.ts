import { useCallback, useEffect, useRef } from 'react'

/** Calls back once the input has been quiet for the delay. Unmounting cancels a pending call. */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
) {
  const callbackRef = useRef(callback)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    callbackRef.current = callback
  })

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current)
  }, [])

  const run = useCallback(
    (...args: Args) => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delayMs)
    },
    [delayMs],
  )

  useEffect(() => cancel, [cancel])

  return { cancel, run }
}
