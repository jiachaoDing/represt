import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { SessionSummaryDetail, SessionSummaryTimeSegment } from '../../db/sessions'
import { SummaryExportButton } from './SummaryExportButton'

type SessionSummaryOverviewProps = {
  detail: SessionSummaryDetail | null
  emptyState?: ReactNode
  exportText?: string | null
  isLoading: boolean
}

function formatTrainingDurationMinutes(minutes: number | null, t: TFunction) {
  if (minutes === null) {
    return '--'
  }

  if (minutes < 60) {
    return t('common.minutes', { value: minutes })
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes === 0
    ? t('common.hours', { value: hours })
    : t('common.hoursMinutes', { hours, minutes: remainingMinutes })
}

function formatSegmentTime(completedAt: string, locale = 'zh-CN') {
  const completedAtDate = new Date(completedAt)
  if (Number.isNaN(completedAtDate.getTime())) {
    return '--'
  }

  return completedAtDate.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTrainingTimeSegments(
  segments: SessionSummaryTimeSegment[],
  locale = 'zh-CN',
) {
  if (segments.length === 0) {
    return '--'
  }

  return segments
    .map((segment) => {
      const startedAt = formatSegmentTime(segment.startedAt, locale)
      const endedAt = formatSegmentTime(segment.endedAt, locale)

      return segment.startedAt === segment.endedAt ? startedAt : `${startedAt}-${endedAt}`
    })
    .join(' · ')
}

export function SessionSummaryOverview({
  detail,
  emptyState,
  exportText = null,
  isLoading,
}: SessionSummaryOverviewProps) {
  const { i18n, t } = useTranslation()
  const completedSetCount =
    detail?.exercises.reduce((acc, exercise) => acc + exercise.completedSets, 0) ?? 0

  if (isLoading) {
    return (
      <div className="mx-4 mt-6 h-[8rem] rounded-3xl bg-[var(--surface-container)] opacity-50 animate-pulse" />
    )
  }

  if (!detail) {
    if (emptyState) {
      return <>{emptyState}</>
    }

    return (
      <div className="mx-4 mt-6 space-y-4 text-center">
        <p className="text-[var(--on-surface-variant)]">{t('summary.sessionNotFound')}</p>
        <Link
          to="/"
          viewTransition
          className="inline-block rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--on-primary)]"
        >
          {t('summary.backToSchedule')}
        </Link>
      </div>
    )
  }

  return (
    <section className="mx-4 mt-4 overflow-hidden rounded-[1.5rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-5 py-4 shadow-[0_4px_18px_-14px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-6 text-[var(--on-surface-variant)]">
            {t('summary.sessionKicker', { date: detail.session.sessionDateKey.slice(5) })}
          </p>
        </div>

        <SummaryExportButton
          ariaLabel={t('summary.export.copyDay')}
          text={exportText}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1.5 text-[var(--on-surface)]">
        <p className="text-[1.75rem] font-black leading-none tracking-normal max-[359px]:text-[1.5rem]">
          {t('common.sets', { value: completedSetCount })}
        </p>
        <span className="text-[0.875rem] font-black leading-none text-[var(--on-surface-variant)]">
          ·
        </span>
        <p className="min-w-0 text-[1.75rem] font-black leading-none tracking-normal max-[359px]:text-[1.5rem]">
          {formatTrainingDurationMinutes(detail.activeDurationMinutes, t)}
        </p>
      </div>

      <div className="mt-5 border-t border-[var(--outline-variant)]/30 pt-4">
        <p className="text-right text-[13px] font-medium leading-5 text-[var(--on-surface-variant)]">
          {formatTrainingTimeSegments(detail.trainingTimeSegments, i18n.resolvedLanguage)}
        </p>
      </div>
    </section>
  )
}
