export interface TextSegment {
  readonly text: string
  readonly isMatch: boolean
}

const CONTEXT_CHARS = 30

/**
 * Splits text around the first match, trimming long text so the match stays visible. Text
 * before it would otherwise push the match out of a one-line row.
 */
export function highlightMatch(text: string, query: string): readonly TextSegment[] {
  const needle = query.trim().toLowerCase()
  const start = needle ? text.toLowerCase().indexOf(needle) : -1

  if (start === -1) {
    return [{ text, isMatch: false }]
  }

  const end = start + needle.length
  const before = text.slice(0, start)
  const trimmedBefore =
    before.length > CONTEXT_CHARS ? `…${before.slice(-CONTEXT_CHARS).trimStart()}` : before

  return [
    { text: trimmedBefore, isMatch: false },
    { text: text.slice(start, end), isMatch: true },
    { text: text.slice(end), isMatch: false },
  ].filter((segment) => segment.text.length > 0)
}
