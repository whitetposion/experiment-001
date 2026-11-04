/** The first letters of the first and last words, such as "MI" for "Maya Iyer". */
export function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ''
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? '') : ''

  return (first + last).toUpperCase()
}
