import { describe, expect, it } from 'vitest'
import { GENERIC_ERROR_MESSAGE, getFailureMessage } from './failureMessage'

describe('getFailureMessage', () => {
  it('reads the message of an API failure or an Error', () => {
    expect(getFailureMessage({ code: 'network', message: 'Offline' })).toBe('Offline')
    expect(getFailureMessage(new Error('Broken'))).toBe('Broken')
  })

  it('falls back when there is no usable message', () => {
    expect(getFailureMessage(undefined)).toBe(GENERIC_ERROR_MESSAGE)
    expect(getFailureMessage('text')).toBe(GENERIC_ERROR_MESSAGE)
    expect(getFailureMessage({ message: 42 })).toBe(GENERIC_ERROR_MESSAGE)
  })
})
