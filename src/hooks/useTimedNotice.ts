import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_DURATION_MS = 2500

/** A short message that clears itself, such as confirmation that something was copied. */
export function useTimedNotice(durationMs = DEFAULT_DURATION_MS) {
  const [notice, setNotice] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showNotice = useCallback(
    (message: string) => {
      clearTimeout(timerRef.current)
      setNotice(message)
      timerRef.current = setTimeout(() => {
        setNotice(null)
      }, durationMs)
    },
    [durationMs],
  )

  useEffect(
    () => () => {
      clearTimeout(timerRef.current)
    },
    [],
  )

  return { notice, showNotice }
}
