import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { CalendarMonthGrid } from '../components/calendar/CalendarMonthGrid'
import { PageHeader } from '../components/ui/PageHeader'
import { useSessionDateKeys } from '../hooks/pages/useSessionDateKeys'
import {
  addMonthsToSessionDateKey,
  formatSessionDateKey,
  getMonthCalendarDateCells,
  getTodaySessionDateKey,
  isSessionDateKey,
} from '../lib/session-date-key'

function buildSummaryPath(dateKey: string) {
  return `/summary?date=${dateKey}`
}

export function CalendarPage() {
  const [searchParams] = useSearchParams()
  const todayDateKey = getTodaySessionDateKey()
  const selectedDateKey = useMemo(() => {
    const currentDate = searchParams.get('date')
    return isSessionDateKey(currentDate) ? currentDate : todayDateKey
  }, [searchParams, todayDateKey])
  const [visibleMonthDateKey, setVisibleMonthDateKey] = useState(selectedDateKey)
  const { error, isLoading, sessionDateKeys } = useSessionDateKeys()
  const sessionDateKeySet = useMemo(() => new Set(sessionDateKeys), [sessionDateKeys])
  const monthLabel = formatSessionDateKey(visibleMonthDateKey, {
    year: 'numeric',
    month: 'long',
  })
  const selectedDateLabel = formatSessionDateKey(selectedDateKey, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
  const calendarCells = useMemo(
    () => getMonthCalendarDateCells(visibleMonthDateKey),
    [visibleMonthDateKey],
  )

  return (
    <div className="pb-4">
      <PageHeader
        title="训练日历"
        subtitle={selectedDateLabel}
        backFallbackTo={buildSummaryPath(selectedDateKey)}
      />

      <section className="mx-4 mt-4 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setVisibleMonthDateKey(addMonthsToSessionDateKey(visibleMonthDateKey, -1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)]"
            aria-label="上个月"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="text-center">
            <p className="text-[11px] text-[var(--on-surface-variant)]">月份</p>
            <p className="mt-1 text-[15px] font-semibold text-[var(--on-surface)]">{monthLabel}</p>
          </div>

          <button
            type="button"
            onClick={() => setVisibleMonthDateKey(addMonthsToSessionDateKey(visibleMonthDateKey, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)]"
            aria-label="下个月"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </section>

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mx-4 mt-4 h-[22rem] rounded-[1.5rem] bg-[var(--surface-container)] opacity-50 animate-pulse" />
      ) : (
        <CalendarMonthGrid
          cells={calendarCells}
          selectedDateKey={selectedDateKey}
          sessionDateKeySet={sessionDateKeySet}
        />
      )}

      {!isLoading && sessionDateKeys.length === 0 ? (
        <div className="mx-4 mt-4 rounded-[1.25rem] border border-dashed border-[var(--outline-variant)]/40 bg-[var(--surface)] px-5 py-8 text-center">
          <p className="text-base font-semibold text-[var(--on-surface)]">还没有训练记录</p>
          <Link
            to={buildSummaryPath(todayDateKey)}
            viewTransition
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[var(--surface-container)] px-4 text-sm font-medium text-[var(--on-surface)]"
          >
            去看今日总结
          </Link>
        </div>
      ) : null}
    </div>
  )
}
