import { calendarDaysBetween } from './calendar'

export function formatMessageTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatFullDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
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

  return days < 7
    ? date.toLocaleDateString(undefined, { weekday: 'long' })
    : formatFullDate(timestamp)
}
