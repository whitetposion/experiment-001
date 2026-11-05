import { useEffect } from 'react'
import { focusConversationSearch } from '@/features/conversations'

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

const isOverlayOpen = () => document.querySelector('[role="dialog"], [role="menu"]') !== null

/**
 * Cmd or Ctrl and K focuses search from anywhere. Slash does too, but only outside a text
 * field, where it has to stay a typed character. Open dialogs and menus keep their keys.
 */
export function useGlobalShortcuts() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.isComposing || event.defaultPrevented || isOverlayOpen()) {
        return
      }

      const isSearchChord =
        event.key.toLowerCase() === 'k' &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey
      const isSlash =
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditable(event.target)

      if (isSearchChord || isSlash) {
        event.preventDefault()
        focusConversationSearch()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}
