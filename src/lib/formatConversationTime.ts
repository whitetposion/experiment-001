function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function calendarDaysBetween(earlier: Date, later: Date) {
  const milliseconds = startOfDay(later).getTime() - startOfDay(earlier).getTime()

  // Rounding absorbs the 23 and 25 hour days at daylight saving changes.
  return Math.round(milliseconds / 86_400_000)
}

/** A short time for lists: a clock time today, then Yesterday, a weekday, and a date. */
export function formatConversationTime(timestamp: string, now = new Date()) {
  const date = new Date(timestamp)
  const days = calendarDaysBetween(date, now)

  if (days <= 0) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }

  if (days === 1) {
    return 'Yesterday'
  }

  if (days < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'long' })
  }

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric', year: '2-digit' })
}
