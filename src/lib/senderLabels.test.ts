import { describe, expect, it } from 'vitest'
import { deletedMessageLabel, firstName } from './senderLabels'

describe('firstName', () => {
  it('takes the first word of a name', () => {
    expect(firstName('Maya Iyer')).toBe('Maya')
    expect(firstName('Maya')).toBe('Maya')
  })

  it('stays undefined for an unknown user', () => {
    expect(firstName(undefined)).toBeUndefined()
  })
})

describe('deletedMessageLabel', () => {
  it('speaks to the sender of the message', () => {
    expect(deletedMessageLabel(true)).toBe('You deleted this message')
    expect(deletedMessageLabel(false)).toBe('This message was deleted')
  })
})
