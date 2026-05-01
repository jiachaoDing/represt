import { addDaysToSessionDateKey, formatSessionDateKey } from '../../lib/session-date-key'

export function getCycleSlotDateKey(anchorDateKey: string, anchorIndex: number, slotIndex: number) {
  return addDaysToSessionDateKey(anchorDateKey, slotIndex - anchorIndex)
}

export function getWeekdayLabel(sessionDateKey: string, locale?: string) {
  return formatSessionDateKey(sessionDateKey, { weekday: 'short' }, locale)
}
