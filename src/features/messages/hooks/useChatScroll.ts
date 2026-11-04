import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MessageId } from '@/types/ids'

/** Within this distance of the end, the reader counts as following the conversation. */
const NEAR_BOTTOM_PX = 80

export interface ChatScrollOptions {
  messageIds: readonly MessageId[]
  isLatestOwn: boolean
}

/**
 * Keeps the reader in the right place as messages change:
 * - Opening a conversation starts at the newest message.
 * - A new message scrolls into view if the reader is at the end, or if they sent it.
 * - A new message leaves the reader alone if they have scrolled up to read history.
 * - Loading older messages keeps what the reader was looking at in place.
 */
export function useChatScroll({ isLatestOwn, messageIds }: ChatScrollOptions) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const previousRef = useRef({
    firstId: undefined as MessageId | undefined,
    lastId: undefined as MessageId | undefined,
    scrollHeight: 0,
  })
  const [isAwayFromBottom, setIsAwayFromBottom] = useState(false)

  // Runs before paint, so the reader never sees the list jump.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current

    if (!scroller) {
      return
    }

    const previous = previousRef.current
    const firstId = messageIds[0]
    const lastId = messageIds.at(-1)
    const wasEmpty = previous.lastId === undefined
    const gainedOlder = !wasEmpty && firstId !== previous.firstId && lastId === previous.lastId
    const gainedNewer = !wasEmpty && lastId !== previous.lastId

    if (gainedOlder) {
      scroller.scrollTop += scroller.scrollHeight - previous.scrollHeight
    } else if (wasEmpty || (gainedNewer && (isNearBottomRef.current || isLatestOwn))) {
      scroller.scrollTop = scroller.scrollHeight
    }

    previousRef.current = { firstId, lastId, scrollHeight: scroller.scrollHeight }
  }, [isLatestOwn, messageIds])

  // The list shrinks when the keyboard opens or the composer grows. Stay at the end if there.
  useEffect(() => {
    const scroller = scrollerRef.current

    if (!scroller) {
      return undefined
    }

    const observer = new ResizeObserver(() => {
      if (isNearBottomRef.current) {
        scroller.scrollTop = scroller.scrollHeight
      }
    })

    observer.observe(scroller)
    return () => {
      observer.disconnect()
    }
  }, [])

  function handleScroll() {
    const scroller = scrollerRef.current

    if (scroller) {
      const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
      isNearBottomRef.current = distance < NEAR_BOTTOM_PX
      setIsAwayFromBottom(!isNearBottomRef.current)
    }
  }

  function scrollToBottom() {
    const scroller = scrollerRef.current

    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight
    }
  }

  return { handleScroll, isAwayFromBottom, scrollerRef, scrollToBottom }
}
