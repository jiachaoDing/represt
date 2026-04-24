import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { SessionExerciseSummaryList } from '../components/summary/SessionExerciseSummaryList'
import { SessionSummaryOverview } from '../components/summary/SessionSummaryOverview'
import { SummaryDateSwitcher } from '../components/summary/SummaryDateSwitcher'
import { PageHeader } from '../components/ui/PageHeader'
import { useSessionSummaryData } from '../hooks/pages/useSessionSummaryData'
import { useBackLinkState } from '../hooks/useRouteBack'
import {
  addDaysToSessionDateKey,
  formatSessionDateKey,
  getTodaySessionDateKey,
  isSessionDateKey,
} from '../lib/session-date-key'

function buildSummarySearch(dateKey: string) {
  return `?date=${dateKey}`
}

export function SummaryPage() {
  const { sessionId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const backLinkState = useBackLinkState()
  const todayDateKey = getTodaySessionDateKey()
  const selectedDateKey = useMemo(() => {
    const currentDate = searchParams.get('date')
    return isSessionDateKey(currentDate) ? currentDate : todayDateKey
  }, [searchParams, todayDateKey])
  const isDateMode = !sessionId
  const { detail, error, isLoading } = useSessionSummaryData({
    sessionDateKey: isDateMode ? selectedDateKey : undefined,
    sessionId,
  })

  function updateSelectedDate(dateKey: string) {
    setSearchParams({ date: dateKey })
  }

  const dateLabel = formatSessionDateKey(selectedDateKey, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
  const calendarTo = `/calendar${buildSummarySearch(selectedDateKey)}`
  const emptyState = isDateMode ? (
    <div className="mx-4 mt-6 rounded-[1.25rem] border border-dashed border-[var(--outline-variant)]/40 bg-[var(--surface)] px-5 py-8 text-center">
      <p className="text-base font-semibold text-[var(--on-surface)]">还没有训练记录</p>
      <p className="mt-2 text-sm leading-5 text-[var(--on-surface-variant)]">
        完成一组后，这里会生成训练总结。
      </p>
      <Link
        to={calendarTo}
        state={backLinkState}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[var(--surface-container)] px-4 text-sm font-medium text-[var(--on-surface)]"
      >
        打开日历
      </Link>
    </div>
  ) : undefined

  return (
    <div className="pb-4">
      <PageHeader
        title="训练总结"
        titleAlign="center"
        backFallbackTo={sessionId ? '/summary' : undefined}
        subtitle={
          isDateMode || !detail
            ? undefined
            : formatSessionDateKey(detail.session.sessionDateKey, {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })
        }
      />

      {isDateMode ? (
        <SummaryDateSwitcher
          dateLabel={dateLabel}
          calendarTo={calendarTo}
          canGoNext={selectedDateKey < todayDateKey}
          onPrevious={() => updateSelectedDate(addDaysToSessionDateKey(selectedDateKey, -1))}
          onNext={() => updateSelectedDate(addDaysToSessionDateKey(selectedDateKey, 1))}
        />
      ) : null}

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      <SessionSummaryOverview detail={detail} emptyState={emptyState} isLoading={isLoading} />
      <SessionExerciseSummaryList detail={detail} />
    </div>
  )
}
