import type { ConversationId } from '@/types/ids'

export const conversationSearchInputId = 'conversation-search'

export function focusConversationSearch() {
  const input = document.getElementById(conversationSearchInputId)

  if (input instanceof HTMLInputElement) {
    input.focus()
    input.select()
  }
}

export function focusConversationRow(conversationId: ConversationId) {
  document.querySelector<HTMLElement>(`[data-conversation-id="${conversationId}"]`)?.focus()
}
