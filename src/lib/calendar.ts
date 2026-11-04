function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function calendarDaysBetween(earlier: Date, later: Date) {
  const milliseconds = startOfDay(later).getTime() - startOfDay(earlier).getTime()

  // Rounding absorbs the 23 and 25 hour days at daylight saving changes.
  return Math.round(milliseconds / 86_400_000)
}

export function isSameDay(first: string, second: string) {
  return calendarDaysBetween(new Date(first), new Date(second)) === 0
}
