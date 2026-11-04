import type { UserId } from './ids'

export interface User {
  readonly id: UserId
  readonly displayName: string
  readonly avatarUrl: string | null
  readonly about: string | null
}
