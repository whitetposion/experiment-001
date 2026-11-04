import { calendarDaysBetween } from './calendar'

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
