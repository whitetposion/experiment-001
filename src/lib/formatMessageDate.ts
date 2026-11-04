import { calendarDaysBetween } from './calendar'

export function formatMessageTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** A label for the divider above each day of messages. */
export function formatMessageDay(timestamp: string, now = new Date()) {
  const date = new Date(timestamp)
  const days = calendarDaysBetween(date, now)

  if (days <= 0) {
    return 'Today'
  }

  if (days === 1) {
    return 'Yesterday'
  }

  return date.toLocaleDateString(
    undefined,
    days < 7 ? { weekday: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' },
  )
}
