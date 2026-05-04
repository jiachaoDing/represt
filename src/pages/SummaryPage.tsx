import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { SummaryAnalyticsSections, SummaryHighlightsCard } from '../components/summary/SummaryAnalyticsSections'
import { SessionExerciseSummaryList } from '../components/summary/SessionExerciseSummaryList'
import { SessionSummaryOverview } from '../components/summary/SessionSummaryOverview'
import { SummaryDateSwitcher } from '../components/summary/SummaryDateSwitcher'
import { SummaryRangeTabs } from '../components/summary/SummaryRangeTabs'
import { PageHeader } from '../components/ui/PageHeader'
import { getSummaryRangeBounds, type SummaryRange } from '../db/sessions'
import { useSessionSummaryData } from '../hooks/pages/useSessionSummaryData'
import { useBackLinkState } from '../hooks/useRouteBack'
import {
  formatSessionDateKey,
  getTodaySessionDateKey,
  isSessionDateKey,
} from '../lib/session-date-key'

function buildSummarySearch(dateKey: string) {
  return `?date=${dateKey}`
}

function isSummaryRange(value: string | null): value is SummaryRange {
  return value === 'day' || value === 'week' || value === 'month'
}

export function SummaryPage() {
  const { i18n, t } = useTranslation()
  const { sessionId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const backLinkState = useBackLinkState()
  const todayDateKey = getTodaySessionDateKey()
  const selectedDateKey = useMemo(() => {
    const currentDate = searchParams.get('date')
    return isSessionDateKey(currentDate) ? currentDate : todayDateKey
  }, [searchParams, todayDateKey])
  const selectedRange = useMemo<SummaryRange>(() => {
    const currentRange = searchParams.get('range')
    return isSummaryRange(currentRange) ? currentRange : 'day'
  }, [searchParams])
  const isDateMode = !sessionId
  const { analytics, detail, error, isLoading } = useSessionSummaryData({
    range: selectedRange,
    sessionDateKey: isDateMode ? selectedDateKey : undefined,
    sessionId,
  })

  const rangeBounds = useMemo(
    () => getSummaryRangeBounds(selectedDateKey, selectedRange),
    [selectedDateKey, selectedRange],
  )
  const dateLabels = useMemo(() => {
    if (selectedRange === 'month') {
      const monthLabel = formatSessionDateKey(selectedDateKey, {
        year: 'numeric',
        month: 'long',
      }, i18n.resolvedLanguage)

      return {
        compact: monthLabel,
        full: monthLabel,
        short: monthLabel,
      }
    }

    if (selectedRange === 'week') {
      const startLabel = formatSessionDateKey(rangeBounds.startDateKey, {
        month: 'short',
        day: 'numeric',
      }, i18n.resolvedLanguage)
      const endLabel = formatSessionDateKey(rangeBounds.endDateKey, {
        month: 'short',
        day: 'numeric',
      }, i18n.resolvedLanguage)
      const label = `${startLabel} - ${endLabel}`

      return {
        compact: label,
        full: label,
        short: label,
      }
    }

    return {
      compact: formatSessionDateKey(selectedDateKey, {
        month: 'short',
        day: 'numeric',
      }, i18n.resolvedLanguage),
      full: formatSessionDateKey(selectedDateKey, {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      }, i18n.resolvedLanguage),
      short: formatSessionDateKey(selectedDateKey, {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      }, i18n.resolvedLanguage),
    }
  }, [i18n.resolvedLanguage, rangeBounds.endDateKey, rangeBounds.startDateKey, selectedDateKey, selectedRange])
  const calendarTo = `/calendar${buildSummarySearch(selectedDateKey)}`
  const rangeLabels: Record<SummaryRange, string> = {
    day: t('summary.ranges.day'),
    week: t('summary.ranges.week'),
    month: t('summary.ranges.month'),
  }
  function handleRangeChange(range: SummaryRange) {
    setSearchParams(range === 'day'
      ? { date: selectedDateKey }
      : { date: selectedDateKey, range })
  }
  const emptyState = isDateMode ? (
    <div className="mx-4 mt-6 rounded-[1.25rem] border border-dashed border-[var(--outline-variant)]/40 bg-[var(--surface)] px-5 py-8 text-center">
      <p className="text-base font-semibold text-[var(--on-surface)]">{t('summary.emptyTitle')}</p>
      <p className="mt-2 text-sm leading-5 text-[var(--on-surface-variant)]">
        {t('summary.emptyDescription')}
      </p>
      <Link
        to={calendarTo}
        state={backLinkState}
        viewTransition
        className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[var(--surface-container)] px-4 text-sm font-medium text-[var(--on-surface)]"
      >
        {t('summary.openCalendar')}
      </Link>
    </div>
  ) : undefined

  return (
    <div className="pb-4">
      {!isDateMode ? (
        <PageHeader
          title={t('summary.detailTitle')}
          titleAlign="center"
          backFallbackTo="/summary"
          subtitle={
            detail
              ? formatSessionDateKey(detail.session.sessionDateKey, {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
                }, i18n.resolvedLanguage)
              : undefined
          }
        />
      ) : null}

      {isDateMode ? (
        <SummaryDateSwitcher
          dateLabels={dateLabels}
          calendarTo={calendarTo}
        />
      ) : null}

      {isDateMode ? (
        <SummaryRangeTabs
          activeRange={selectedRange}
          labels={rangeLabels}
          onChange={handleRangeChange}
        />
      ) : null}

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      {!isDateMode || selectedRange === 'day' ? (
        <>
          <SessionSummaryOverview detail={detail} emptyState={emptyState} isLoading={isLoading} />
          <SummaryHighlightsCard analytics={analytics} />
          <SessionExerciseSummaryList detail={detail} />
        </>
      ) : (
        <SummaryAnalyticsSections analytics={analytics} isLoading={isLoading} />
      )}
    </div>
  )
}
