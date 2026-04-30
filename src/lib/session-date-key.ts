type SessionDateFormatOptions = Intl.DateTimeFormatOptions

export type CalendarDateCell = {
  dateKey: string
  dayNumber: number
  isCurrentMonth: boolean
}

const debugDateOffsetStorageKey = 'trainre.debug-date-offset-days.v1'

function buildSessionDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getDebugDateOffsetDays() {
  const value = localStorage.getItem(debugDateOffsetStorageKey)
  const parsedValue = value === null ? 0 : Number(value)

  return Number.isInteger(parsedValue) ? parsedValue : 0
}

export function getTodaySessionDateKey() {
  const date = new Date()
  date.setDate(date.getDate() + getDebugDateOffsetDays())

  return buildSessionDateKey(date)
}

export function parseSessionDateKey(sessionDateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sessionDateKey)
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, monthIndex, day)

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

export function isSessionDateKey(sessionDateKey: string | null | undefined): sessionDateKey is string {
  if (!sessionDateKey) {
    return false
  }

  return parseSessionDateKey(sessionDateKey) !== null
}

export function formatSessionDateKey(
  sessionDateKey: string,
  options: SessionDateFormatOptions,
  locale = 'zh-CN',
) {
  const date = parseSessionDateKey(sessionDateKey)
  if (!date) {
    return sessionDateKey
  }

  return new Intl.DateTimeFormat(locale, options).format(date)
}

export function addDaysToSessionDateKey(sessionDateKey: string, amount: number) {
  const date = parseSessionDateKey(sessionDateKey)
  if (!date) {
    return sessionDateKey
  }

  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + amount)

  return buildSessionDateKey(nextDate)
}

export function setDebugTodaySessionDateKey(sessionDateKey: string) {
  const date = parseSessionDateKey(sessionDateKey)
  if (!date) {
    return getDebugDateOffsetDays()
  }

  const realTodayDateKey = buildSessionDateKey(new Date())
  const offsetDays = diffSessionDateKeys(sessionDateKey, realTodayDateKey)
  localStorage.setItem(debugDateOffsetStorageKey, String(offsetDays))

  return offsetDays
}

export function advanceDebugDateByOneDay() {
  const offsetDays = getDebugDateOffsetDays() + 1
  localStorage.setItem(debugDateOffsetStorageKey, String(offsetDays))

  return offsetDays
}

export function resetDebugDateOffset() {
  localStorage.removeItem(debugDateOffsetStorageKey)
}

export function addMonthsToSessionDateKey(sessionDateKey: string, amount: number) {
  const date = parseSessionDateKey(sessionDateKey)
  if (!date) {
    return sessionDateKey
  }

  return buildSessionDateKey(new Date(date.getFullYear(), date.getMonth() + amount, 1))
}

export function diffSessionDateKeys(leftSessionDateKey: string, rightSessionDateKey: string) {
  const leftDate = parseSessionDateKey(leftSessionDateKey)
  const rightDate = parseSessionDateKey(rightSessionDateKey)

  if (!leftDate || !rightDate) {
    return 0
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000

  return Math.round((leftDate.getTime() - rightDate.getTime()) / millisecondsPerDay)
}

export function getMonthCalendarDateCells(sessionDateKey: string) {
  const date = parseSessionDateKey(sessionDateKey)
  if (!date) {
    return [] satisfies CalendarDateCell[]
  }

  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const firstWeekday = firstDay.getDay()
  const calendarStart = new Date(firstDay)
  calendarStart.setDate(firstDay.getDate() - firstWeekday)

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(calendarStart)
    cellDate.setDate(calendarStart.getDate() + index)

    return {
      dateKey: buildSessionDateKey(cellDate),
      dayNumber: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === date.getMonth(),
    } satisfies CalendarDateCell
  })
}
