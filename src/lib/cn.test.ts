import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('lets the last conflicting Tailwind class win', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('drops falsy values', () => {
    expect(cn('flex', false, undefined, 'gap-2')).toBe('flex gap-2')
  })

  it.each([
    ['rounded-control', 'rounded-md'],
    ['shadow-panel', 'shadow-sm'],
    ['h-control', 'h-control-sm'],
    ['p-panel', 'p-4'],
    ['backdrop-blur-panel', 'backdrop-blur-sm'],
    ['duration-fast', 'duration-slow'],
    ['opacity-disabled', 'opacity-subtle'],
    ['ease-standard', 'ease-emphasized'],
  ])('resolves the token conflict between %s and %s', (first, second) => {
    expect(cn(first, second)).toBe(second)
  })

  it('keeps text color and text size together', () => {
    expect(cn('text-sm', 'text-primary-foreground')).toBe('text-sm text-primary-foreground')
  })
})
