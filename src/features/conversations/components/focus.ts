import type { ConversationId } from '@/types/ids'

const SEARCH_INPUT_ID = 'conversation-search'

export const conversationSearchInputId = SEARCH_INPUT_ID

export function focusConversationSearch() {
  const input = document.getElementById(SEARCH_INPUT_ID)

  if (input instanceof HTMLInputElement) {
    input.focus()
    input.select()
  }
}

export function focusConversationRow(conversationId: ConversationId) {
  document.querySelector<HTMLElement>(`[data-conversation-id="${conversationId}"]`)?.focus()
}
