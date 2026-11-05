import { useEffect, useRef } from 'react'
import { useAppSelector } from '@/app/hooks'
import { selectSelectedConversationId, useCloseConversation } from '@/features/conversations'

/**
 * Makes the system back button or gesture close an open chat, as it does in any phone app.
 * Without a history entry for the open chat, going back would leave the app altogether.
 */
export function useConversationBackNavigation() {
  const selectedId = useAppSelector(selectSelectedConversationId)
  const closeConversation = useCloseConversation()
  const hasEntryRef = useRef(false)
  const isOpen = selectedId !== null

  // Switching between chats keeps the one entry, so back always returns to the list.
  useEffect(() => {
    if (isOpen === hasEntryRef.current) {
      return
    }

    hasEntryRef.current = isOpen

    if (isOpen) {
      history.pushState(null, '')
    } else {
      history.back()
    }
  }, [isOpen])

  useEffect(() => {
    if (!selectedId) {
      return undefined
    }

    const handlePopState = () => {
      hasEntryRef.current = false
      closeConversation(selectedId)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [closeConversation, selectedId])
}
