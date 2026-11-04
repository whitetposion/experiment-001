import type { ConversationId, IsoTimestamp, UserId } from './ids'

export type PresenceStatus = 'online' | 'offline'

/** Kept apart from User because it changes constantly while a profile rarely does. */
export interface UserPresence {
  readonly userId: UserId
  readonly status: PresenceStatus
  readonly lastSeenAt: IsoTimestamp | null
}

export interface TypingIndicator {
  readonly conversationId: ConversationId
  readonly userId: UserId
  readonly startedAt: IsoTimestamp
  /** Clears the indicator if the event that should stop it never arrives. */
  readonly expiresAt: IsoTimestamp
}
