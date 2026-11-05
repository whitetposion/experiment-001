import { markConversationRead, selectSelectedConversationId } from '@/features/conversations'
import { messageReceived, messageStatusChanged } from '@/features/messages'
import { presenceChanged, typingStarted, typingStopped } from '@/features/presence'
import type { ChatEvent } from '@/services/chatApi'
import { conversationMemberKey } from '@/types/ids'
import type { AppThunk } from './hooks'

/**
 * Turns live backend events into Redux actions. Returns the function that disconnects,
 * which also clears the timers it started.
 */
export function connectChatEvents(): AppThunk<() => void> {
  return (dispatch, getState, { api }) => {
    const typingTimers = new Map<string, ReturnType<typeof setTimeout>>()

    function clearTypingTimer(key: string) {
      clearTimeout(typingTimers.get(key))
      typingTimers.delete(key)
    }

    function handleEvent(event: ChatEvent) {
      switch (event.type) {
        case 'message-received': {
          const { conversationId } = event.message

          dispatch(messageReceived(event.message))

          // Someone reading the conversation has seen it, so the server needs to know.
          if (selectSelectedConversationId(getState()) === conversationId) {
            void dispatch(markConversationRead(conversationId))
          }
          break
        }

        case 'message-status-changed':
          dispatch(messageStatusChanged({ messageId: event.messageId, status: event.status }))
          break

        case 'presence-changed':
          dispatch(presenceChanged(event.presence))
          break

        case 'typing-started': {
          const { indicator } = event
          const { conversationId, expiresAt, startedAt, userId } = indicator
          const key = conversationMemberKey(conversationId, userId)
          const duration = new Date(expiresAt).getTime() - new Date(startedAt).getTime()

          dispatch(typingStarted(indicator))
          clearTypingTimer(key)

          // A lost stop event must not leave someone typing forever.
          typingTimers.set(
            key,
            setTimeout(() => {
              typingTimers.delete(key)
              dispatch(typingStopped({ conversationId, userId }))
            }, duration),
          )
          break
        }

        case 'typing-stopped': {
          const { conversationId, userId } = event

          clearTypingTimer(conversationMemberKey(conversationId, userId))
          dispatch(typingStopped({ conversationId, userId }))
          break
        }
      }
    }

    const unsubscribe = api.subscribe(handleEvent)

    return () => {
      unsubscribe()

      for (const timer of typingTimers.values()) {
        clearTimeout(timer)
      }
      typingTimers.clear()
    }
  }
}
