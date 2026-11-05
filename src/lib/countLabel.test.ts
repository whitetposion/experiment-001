import { describe, expect, it } from 'vitest'
import { countLabel } from './countLabel'

describe('countLabel', () => {
  it('matches the noun to the count', () => {
    expect(countLabel(0, 'member')).toBe('0 members')
    expect(countLabel(1, 'member')).toBe('1 member')
    expect(countLabel(2, 'member')).toBe('2 members')
  })

  it('accepts an irregular plural', () => {
    expect(countLabel(2, 'person', 'people')).toBe('2 people')
  })
})
