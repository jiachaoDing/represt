type SessionDateFormatOptions = Intl.DateTimeFormatOptions

export type CalendarDateCell = {
  dateKey: string
  dayNumber: number
  isCurrentMonth: boolean
}

function buildSessionDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getTodaySessionDateKey() {
  return buildSessionDateKey(new Date())
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
) {
  const date = parseSessionDateKey(sessionDateKey)
  if (!date) {
    return sessionDateKey
  }

  return new Intl.DateTimeFormat('zh-CN', options).format(date)
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

export function addMonthsToSessionDateKey(sessionDateKey: string, amount: number) {
  const date = parseSessionDateKey(sessionDateKey)
  if (!date) {
    return sessionDateKey
  }

  return buildSessionDateKey(new Date(date.getFullYear(), date.getMonth() + amount, 1))
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
