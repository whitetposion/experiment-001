import { describe, expect, it } from 'vitest'
import { highlightMatch } from './highlightMatch'

describe('highlightMatch', () => {
  it('splits around the match, keeping its original case', () => {
    expect(highlightMatch('Payments passed review', 'PASSED')).toEqual([
      { text: 'Payments ', isMatch: false },
      { text: 'passed', isMatch: true },
      { text: ' review', isMatch: false },
    ])
  })

  it('handles a match at the start or end', () => {
    expect(highlightMatch('Done', 'done')).toEqual([{ text: 'Done', isMatch: true }])
  })

  it('trims long text before the match so it stays visible', () => {
    const [before] = highlightMatch(`${'word '.repeat(40)}target`, 'target')

    expect(before?.text.startsWith('…')).toBe(true)
    expect(before?.text.length).toBeLessThanOrEqual(31)
  })

  it('returns plain text when nothing matches or the query is blank', () => {
    expect(highlightMatch('Hello', 'zzz')).toEqual([{ text: 'Hello', isMatch: false }])
    expect(highlightMatch('Hello', '  ')).toEqual([{ text: 'Hello', isMatch: false }])
  })

  it('treats regular expression characters as plain text', () => {
    expect(highlightMatch('a.b (c)', '(c)')[1]).toEqual({ text: '(c)', isMatch: true })
  })
})
