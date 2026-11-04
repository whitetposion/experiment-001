import { makeStore } from '@/app/store'
import { createMockChatApi, type MockChatApiOptions } from '@/services/mock-api/createMockChatApi'

export const TEST_NOW = new Date('2026-11-05T12:00:00.000Z')

/** A store on its own fast mock backend, with a fixed clock. */
export function createTestStore(options: MockChatApiOptions = {}) {
  const api = createMockChatApi({ now: () => TEST_NOW, latencyMs: { min: 0, max: 0 }, ...options })
  return { api, store: makeStore({ api }) }
}
