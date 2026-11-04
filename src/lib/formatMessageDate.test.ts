import { describe, expect, it } from 'vitest'
import { isSameDay } from './calendar'
import { formatMessageDay, formatMessageTime } from './formatMessageDate'

const now = new Date(2026, 10, 5, 12, 0)
const at = (...args: [number, number, number, number, number]) => new Date(...args).toISOString()

describe('formatMessageDay', () => {
  it('uses Today and Yesterday by calendar day', () => {
    expect(formatMessageDay(at(2026, 10, 5, 0, 1), now)).toBe('Today')
    expect(formatMessageDay(at(2026, 10, 4, 23, 59), now)).toBe('Yesterday')
  })

  it('uses a weekday within a week, then a full date', () => {
    expect(formatMessageDay(at(2026, 10, 2, 10, 0), now)).toBe(
      new Date(2026, 10, 2).toLocaleDateString(undefined, { weekday: 'long' }),
    )
    expect(formatMessageDay(at(2026, 9, 20, 10, 0), now)).toMatch(/2026/)
  })
})

describe('formatMessageTime', () => {
  it('shows the clock time', () => {
    expect(formatMessageTime(at(2026, 10, 5, 9, 54))).toMatch(/9:54/)
  })
})

describe('isSameDay', () => {
  it('compares calendar days, not 24 hour gaps', () => {
    expect(isSameDay(at(2026, 10, 5, 0, 1), at(2026, 10, 5, 23, 59))).toBe(true)
    expect(isSameDay(at(2026, 10, 4, 23, 59), at(2026, 10, 5, 0, 1))).toBe(false)
  })
})
