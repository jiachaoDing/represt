import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getExerciseProfileId } from '../../db/sessions'
import type {
  SummaryMetricKind,
  SummaryRangeAnalytics,
  SummaryRecordHighlight,
} from '../../db/sessions'
import { getMuscleGroupName } from '../../lib/exercise-catalog-i18n'
import { getDisplayExerciseName } from '../../lib/exercise-name'
import {
  formatDistanceMeters,
  formatDurationSeconds,
  formatNumber,
} from '../../lib/set-record-measurement'
import {
  formatLoadDistanceVolume,
  formatWeightKg,
  formatWeightRepsVolume,
} from '../../lib/weight-units'
import { SummaryExportButton } from './SummaryExportButton'

type SummaryAnalyticsSectionsProps = {
  analytics: SummaryRangeAnalytics | null
  exportText?: string | null
  isLoading: boolean
}

function formatMetricValue(kind: SummaryMetricKind, value: number, t: TFunction) {
  if (kind === 'highestWeight') {
    return formatWeightKg(value, t)
  }
  if (kind === 'maxReps') {
    return t('common.reps', { value: formatNumber(value) })
  }
  if (kind === 'longestDuration') {
    return formatDurationSeconds(value, t)
  }
  if (kind === 'longestDistance') {
    return formatDistanceMeters(value, t)
  }
  if (kind === 'loadDistanceVolume') {
    return t('summary.analytics.loadDistanceValue', { value: formatLoadDistanceVolume(value, t) })
  }

  return t('summary.analytics.volumeValue', { value: formatWeightRepsVolume(value, t) })
}

function getMetricLabel(kind: SummaryMetricKind, t: TFunction) {
  return t(`summary.analytics.metrics.${kind}`)
}

function getExerciseRecordPath(input: { catalogExerciseId: string | null; exerciseName: string }) {
  const profileId = getExerciseProfileId({
    catalogExerciseId: input.catalogExerciseId,
    name: input.exerciseName,
  })

  return `/summary/exercises/${encodeURIComponent(profileId)}`
}

function formatTrainingDurationMinutes(minutes: number, t: TFunction) {
  if (minutes < 60) {
    return t('summary.analytics.durationMinutesCompact', { value: minutes })
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes === 0
    ? t('summary.analytics.durationHoursCompact', { value: hours })
    : t('summary.analytics.durationHoursMinutesCompact', { hours, minutes: remainingMinutes })
}

function getPreferredTrainingTimeLabel(analytics: SummaryRangeAnalytics, t: TFunction) {
  return analytics.preferredTrainingTimeBucket
    ? t(`summary.analytics.timeBuckets.${analytics.preferredTrainingTimeBucket}`)
    : '--'
}

function getDistributionLabel(
  item: SummaryRangeAnalytics['distribution'][number],
  t: TFunction,
) {
  return item.muscleGroup === 'other'
    ? t('summary.analytics.otherDistribution')
    : getMuscleGroupName(t, item.muscleGroup)
}

function getDistributionSummaryLabel(
  item: SummaryRangeAnalytics['distribution'][number],
  t: TFunction,
) {
  return getDistributionLabel(item, t).replace(/肌群$/, '')
}

function OverviewCard({
  analytics,
  exportText,
}: {
  analytics: SummaryRangeAnalytics
  exportText: string | null
}) {
  const { t } = useTranslation()
  const metrics = [
    {
      label: t('summary.analytics.trainingDaysFull'),
      value: String(analytics.trainingDays),
    },
    {
      label: t('summary.analytics.completedSetsFull'),
      value: String(analytics.completedSets),
    },
    {
      label: t('summary.analytics.exerciseQuantity'),
      value: t('summary.analytics.exerciseQuantityValue', { count: analytics.exerciseCount }),
    },
    {
      label: t('summary.analytics.trainingSegmentCount'),
      value: String(analytics.trainingSegmentCount),
    },
    {
      label: t('summary.analytics.preferredTrainingTime'),
      value: getPreferredTrainingTimeLabel(analytics, t),
    },
    {
      label: t('summary.analytics.totalDurationShort'),
      value: formatTrainingDurationMinutes(analytics.totalActiveDurationMinutes, t),
    },
  ]

  return (
    <section className="mx-4 mt-4 rounded-[1.5rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-5 shadow-[0_4px_18px_-14px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-[20px] font-bold text-[var(--on-surface)]">
          {t('summary.analytics.monthReview')}
        </h2>
        <SummaryExportButton
          ariaLabel={t('summary.export.copyMonth')}
          text={exportText}
        />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-5 border-b border-[var(--outline-variant)]/30 pb-5">
        {metrics.slice(0, 3).map((item) => (
          <div key={item.label} className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--on-surface-variant)]">{item.label}</p>
            <p className="mt-2 whitespace-nowrap text-[21px] font-bold leading-7 text-[var(--on-surface)]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-x-3 gap-y-5">
        {metrics.slice(3).map((item) => (
          <div key={item.label} className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--on-surface-variant)]">{item.label}</p>
            <p className="mt-2 whitespace-nowrap text-[21px] font-bold leading-7 text-[var(--on-surface)]">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function HighlightRow({ item }: { item: SummaryRecordHighlight }) {
  const { t } = useTranslation()
  const displayName = getDisplayExerciseName(t, {
    catalogExerciseId: item.catalogExerciseId,
    name: item.exerciseName,
  })
  const detailPath = getExerciseRecordPath(item)

  return (
    <Link
      to={detailPath}
      viewTransition
      className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-container)] px-3 py-3"
    >
      <div className="min-w-0">
        <p className="truncate text-[14px] font-bold text-[var(--on-surface)]">{displayName}</p>
        <p className="mt-1 text-[12px] text-[var(--on-surface-variant)]">
          {item.type === 'first' ? t('summary.analytics.firstRecord') : t('summary.analytics.pr')} · {getMetricLabel(item.metricKind, t)}
        </p>
      </div>
      <p className="shrink-0 text-[15px] font-bold text-[var(--on-surface)]">
        {formatMetricValue(item.metricKind, item.value, t)}
      </p>
    </Link>
  )
}

function HighlightsCard({ analytics }: { analytics: SummaryRangeAnalytics }) {
  const { t } = useTranslation()

  if (analytics.highlights.length === 0) {
    return null
  }

  return (
    <section className="mx-4 mt-3 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-bold text-[var(--on-surface)]">{t('summary.analytics.highlights')}</h2>
        <span className="rounded-full bg-[var(--tertiary-container)] px-3 py-1 text-[12px] font-semibold text-[var(--on-tertiary-container)]">
          {t('summary.analytics.realRecords')}
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {analytics.highlights.map((item) => (
          <HighlightRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

function DistributionCard({ analytics }: { analytics: SummaryRangeAnalytics }) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  if (analytics.distribution.length === 0) {
    return null
  }
  const visibleItems = analytics.distribution.slice(0, 5)
  const topSummary = analytics.distribution
    .slice(0, 3)
    .map((item) => getDistributionSummaryLabel(item, t))
    .join('·')

  return (
    <section className="mx-4 mt-4 rounded-[1.5rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-5 shadow-[0_4px_18px_-14px_rgba(0,0,0,0.24)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-[20px] font-bold text-[var(--on-surface)]">{t('summary.analytics.distribution')}</h2>
      </div>

      <div className="mt-5 flex h-9 overflow-hidden rounded-xl bg-[var(--surface-container)]">
        {visibleItems.map((item, index) => (
          <div
            key={item.muscleGroup}
            className={[
              'flex min-w-0 items-center justify-center border-r border-[var(--surface)] text-[12px] font-semibold text-white last:border-r-0',
              index === 0 ? 'bg-[var(--plan-1)]' : '',
              index === 1 ? 'bg-[var(--plan-2)]' : '',
              index === 2 ? 'bg-[var(--plan-3)]' : '',
              index === 3 ? 'bg-[var(--plan-5)]' : '',
              index > 3 ? 'bg-[var(--tertiary)]' : '',
            ].join(' ')}
            style={{ width: `${item.percentage}%` }}
            title={`${getDistributionLabel(item, t)} ${item.percentage}%`}
          >
            {item.percentage >= 8 ? `${item.percentage}%` : null}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 px-1">
        <p className="min-w-0 truncate text-[14px] font-semibold text-[var(--on-surface)]">{topSummary}</p>
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          aria-label={t(isExpanded ? 'summary.analytics.collapseDistribution' : 'summary.analytics.expandDistribution')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
        >
          {isExpanded ? (
            <ChevronUp size={18} strokeWidth={2.3} aria-hidden="true" />
          ) : (
            <ChevronDown size={18} strokeWidth={2.3} aria-hidden="true" />
          )}
        </button>
      </div>

      {isExpanded ? (
        <div className="mt-3 flex flex-col divide-y divide-[var(--outline-variant)]/25 rounded-2xl bg-[var(--surface-container)]/40 px-4">
          {analytics.distribution.map((item) => (
            <div key={item.muscleGroup} className="flex items-center justify-between gap-3 py-3 text-[13px]">
              <span className="min-w-0 truncate font-medium text-[var(--on-surface)]">{getDistributionLabel(item, t)}</span>
              <span className="shrink-0 font-semibold text-[var(--on-surface-variant)]">{item.percentage}%</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export function SummaryHighlightsCard({ analytics }: { analytics: SummaryRangeAnalytics | null }) {
  return analytics ? <HighlightsCard analytics={analytics} /> : null
}

export function SummaryAnalyticsSections({
  analytics,
  exportText = null,
  isLoading,
}: SummaryAnalyticsSectionsProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="mx-4 mt-6 h-[16rem] rounded-3xl bg-[var(--surface-container)] opacity-50 animate-pulse" />
    )
  }

  if (!analytics || analytics.completedSets === 0) {
    return (
      <section className="mx-4 mt-6 rounded-[1.25rem] border border-dashed border-[var(--outline-variant)]/40 bg-[var(--surface)] px-5 py-8 text-center">
        <p className="text-base font-semibold text-[var(--on-surface)]">
          {t('summary.analytics.emptyMonthTitle')}
        </p>
        <p className="mt-2 text-sm leading-5 text-[var(--on-surface-variant)]">
          {t('summary.emptyDescription')}
        </p>
      </section>
    )
  }

  return (
    <>
      <OverviewCard analytics={analytics} exportText={exportText} />
      <DistributionCard analytics={analytics} />
    </>
  )
}
