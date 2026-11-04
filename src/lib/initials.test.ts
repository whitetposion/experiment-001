import { describe, expect, it } from 'vitest'
import { getInitials } from './initials'

describe('getInitials', () => {
  it.each([
    ['Maya Iyer', 'MI'],
    ['maya', 'M'],
    ['Maya Lakshmi Iyer', 'MI'],
    ['  Maya   Iyer  ', 'MI'],
    ['', ''],
  ])('%s gives "%s"', (name, initials) => {
    expect(getInitials(name)).toBe(initials)
  })
})
