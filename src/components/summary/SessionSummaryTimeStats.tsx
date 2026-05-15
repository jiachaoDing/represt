import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import type { SessionSummaryDetail, SessionSummaryTimeSegment } from '../../db/sessions'

type SessionSummaryTimeStatsProps = {
  detail: SessionSummaryDetail | null
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

export function SessionSummaryTimeStats({ detail }: SessionSummaryTimeStatsProps) {
  const { i18n, t } = useTranslation()

  if (!detail) {
    return null
  }

  return (
    <section className="mx-4 mb-20 mt-2 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <h2 className="text-[16px] font-bold text-[var(--on-surface)]">{t('summary.timeStats')}</h2>
      <div className="mt-3">
        <p className="text-[12px] font-medium text-[var(--on-surface-variant)]">{t('summary.trainingDuration')}</p>
        <p className="mt-1 text-[28px] font-bold leading-none tracking-normal text-[var(--on-surface)]">
          {formatTrainingDurationMinutes(detail.activeDurationMinutes, t)}
        </p>
        <p className="mt-3 text-[12px] leading-5 text-[var(--on-surface-variant)]">
          {t('summary.trainingTimeSegments', {
            segments: formatTrainingTimeSegments(detail.trainingTimeSegments, i18n.resolvedLanguage),
          })}
        </p>
      </div>
    </section>
  )
}
