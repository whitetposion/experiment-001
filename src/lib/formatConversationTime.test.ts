import { describe, expect, it } from 'vitest'
import { formatConversationTime } from './formatConversationTime'

const now = new Date(2026, 10, 5, 12, 0)
const at = (...args: [number, number, number, number, number]) => new Date(...args).toISOString()

describe('formatConversationTime', () => {
  it('shows a clock time for today', () => {
    expect(formatConversationTime(at(2026, 10, 5, 9, 54), now)).toMatch(/9:54/)
  })

  it('uses calendar days, not 24 hour periods', () => {
    expect(formatConversationTime(at(2026, 10, 4, 23, 59), now)).toBe('Yesterday')
    expect(formatConversationTime(at(2026, 10, 5, 0, 1), now)).toMatch(/12:01|0:01/)
  })

  it('shows a weekday within the last week', () => {
    expect(formatConversationTime(at(2026, 10, 3, 10, 0), now)).toBe(
      new Date(2026, 10, 3).toLocaleDateString(undefined, { weekday: 'long' }),
    )
  })

  it('shows a date after a week', () => {
    const label = formatConversationTime(at(2026, 9, 29, 10, 0), now)

    expect(label).toMatch(/\d/)
    expect(label).toMatch(/26/)
  })

  it('treats a slightly future time as today', () => {
    expect(formatConversationTime(at(2026, 10, 5, 12, 1), now)).toMatch(/12:01/)
  })
})
