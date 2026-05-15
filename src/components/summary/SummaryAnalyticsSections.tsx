import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Link } from 'react-router-dom'

import { getExerciseProfileId } from '../../db/sessions'
import type {
  SummaryMetricKind,
  SummaryRangeAnalytics,
  SummaryRecordHighlight,
  SummaryTrendPoint,
} from '../../db/sessions'
import { getMuscleGroupName } from '../../lib/exercise-catalog-i18n'
import { getDisplayExerciseName } from '../../lib/exercise-name'
import {
  formatDistanceMeters,
  formatDurationSeconds,
  formatNumber,
} from '../../lib/set-record-measurement'

type SummaryAnalyticsSectionsProps = {
  analytics: SummaryRangeAnalytics | null
  isLoading: boolean
}

function formatMetricValue(kind: SummaryMetricKind, value: number, t: TFunction) {
  if (kind === 'highestWeight') {
    return t('common.kg', { value: formatNumber(value) })
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
    return t('summary.analytics.loadDistanceValue', { value: formatNumber(value) })
  }

  return t('summary.analytics.volumeValue', { value: formatNumber(value) })
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
    return t('common.minutes', { value: minutes })
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes === 0
    ? t('common.hours', { value: hours })
    : t('common.hoursMinutes', { hours, minutes: remainingMinutes })
}

function OverviewCard({ analytics }: { analytics: SummaryRangeAnalytics }) {
  const { t } = useTranslation()

  return (
    <section className="mx-4 mt-4 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <h2 className="text-[16px] font-bold text-[var(--on-surface)]">
        {analytics.range === 'week' ? t('summary.analytics.weekOverview') : t('summary.analytics.monthOverview')}
      </h2>
      <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-2xl border border-[var(--outline-variant)]/30">
        {[
          { label: t('summary.analytics.trainingDays'), value: t('summary.analytics.daysValue', { value: analytics.trainingDays }) },
          { label: t('summary.analytics.completedSets'), value: t('common.sets', { value: analytics.completedSets }) },
          { label: t('summary.analytics.exerciseCount'), value: t('summary.exerciseCount', { count: analytics.exerciseCount }) },
          {
            label: t('summary.analytics.totalTrainingDuration'),
            value: formatTrainingDurationMinutes(analytics.totalActiveDurationMinutes, t),
          },
        ].map((item, index) => (
          <div
            key={`${item.label}:${index}`}
            className="border-b border-r border-[var(--outline-variant)]/30 px-4 py-3 last:border-r-0 [&:nth-child(2n)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0"
          >
            <p className="text-[12px] text-[var(--on-surface-variant)]">{item.label}</p>
            <p className="mt-1 text-[20px] font-bold text-[var(--on-surface)]">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function TimeStatsCard({ analytics }: { analytics: SummaryRangeAnalytics }) {
  const { t } = useTranslation()
  const preferredBucket = analytics.preferredTrainingTimeBucket

  return (
    <section className="mx-4 mt-3 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <h2 className="text-[16px] font-bold text-[var(--on-surface)]">{t('summary.timeStats')}</h2>
      <div className="mt-3 flex flex-col divide-y divide-[var(--outline-variant)]/25">
        {[
          {
            label: t('summary.analytics.averageTrainingDuration'),
            value: formatTrainingDurationMinutes(analytics.averageActiveDurationMinutes, t),
          },
          {
            label: t('summary.analytics.trainingSegmentCount'),
            value: t('summary.analytics.trainingSegmentCountValue', { value: analytics.trainingSegmentCount }),
          },
          {
            label: t('summary.analytics.preferredTrainingTime'),
            value: preferredBucket ? t(`summary.analytics.timeBuckets.${preferredBucket}`) : '--',
          },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <p className="text-[13px] text-[var(--on-surface-variant)]">{item.label}</p>
            <p className="text-right text-[15px] font-bold text-[var(--on-surface)]">{item.value}</p>
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

function TrendCard({ analytics }: { analytics: SummaryRangeAnalytics }) {
  const { t } = useTranslation()
  const points = analytics.trendPoints
  const maxValue = Math.max(...points.map((point) => point.value), 1)

  if (points.length === 0) {
    return null
  }

  return (
    <section className="mx-4 mt-3 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <h2 className="text-[16px] font-bold text-[var(--on-surface)]">
        {analytics.range === 'week' ? t('summary.analytics.weekTrend') : t('summary.analytics.monthTrend')}
      </h2>
      <div className="mt-4 flex h-36 items-end justify-around gap-3">
        {points.map((point) => (
          <div key={point.key} className="flex w-12 min-w-0 flex-col items-center gap-2">
            <div className="flex h-24 w-9 items-end rounded-full bg-[var(--surface-container)]">
              <div
                className="w-full rounded-full bg-[var(--plan-1)]"
                style={{ height: `${Math.max((point.value / maxValue) * 100, point.value > 0 ? 8 : 0)}%` }}
              />
            </div>
            <span className="max-w-full truncate text-[10px] text-[var(--on-surface-variant)]">
              {analytics.range === 'month'
                ? t('summary.analytics.weekNumber', { value: point.label })
                : point.label}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-[var(--on-surface-variant)]">{t('summary.analytics.trendUnitSets')}</p>
    </section>
  )
}

function getTrendPointLabel(point: SummaryTrendPoint, analytics: SummaryRangeAnalytics, t: TFunction) {
  return analytics.range === 'month' ? t('summary.analytics.weekNumber', { value: point.label }) : point.label
}

function buildSparklinePoints(points: SummaryTrendPoint[]) {
  const width = 240
  const height = 88
  const paddingX = 8
  const paddingY = 12
  const values = points.map((point) => point.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueRange = maxValue - minValue
  const plotWidth = width - paddingX * 2
  const plotHeight = height - paddingY * 2

  return points.map((point, index) => {
    const x = paddingX + (plotWidth / Math.max(points.length - 1, 1)) * index
    const normalized = valueRange === 0 ? 0.5 : (point.value - minValue) / valueRange
    const y = paddingY + (1 - normalized) * plotHeight

    return { ...point, x, y }
  })
}

function ExerciseTrendCard({ analytics }: { analytics: SummaryRangeAnalytics }) {
  const { t } = useTranslation()
  const trend = analytics.topExerciseTrend
  if (!trend) {
    return null
  }

  const displayName = getDisplayExerciseName(t, {
    catalogExerciseId: trend.catalogExerciseId,
    name: trend.exerciseName,
  })
  const metricLabel = getMetricLabel(trend.metricKind, t)
  const chartPoints = buildSparklinePoints(trend.points)
  const linePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(' ')
  const firstPoint = trend.points[0]
  const lastPoint = trend.points[trend.points.length - 1]
  const detailPath = getExerciseRecordPath(trend)

  return (
    <Link
      to={detailPath}
      viewTransition
      className="mx-4 mt-3 block rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]"
    >
      <h2 className="text-[16px] font-bold text-[var(--on-surface)]">{t('summary.analytics.exerciseTrend')}</h2>
      <p className="mt-1 text-[13px] text-[var(--on-surface-variant)]">
        {displayName} · {metricLabel}
      </p>
      <div className="mt-3 rounded-2xl bg-[var(--surface-container)] px-2 py-3">
        <svg viewBox="0 0 240 88" className="h-24 w-full overflow-visible" role="img" aria-label={`${displayName} ${metricLabel}`}>
          <line x1="8" y1="76" x2="232" y2="76" stroke="var(--outline-variant)" strokeWidth="1" opacity="0.45" />
          <polyline points={linePoints} fill="none" stroke="var(--plan-1)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {chartPoints.map((point) => (
            <circle key={point.key} cx={point.x} cy={point.y} r="4" fill="var(--surface)" stroke="var(--plan-1)" strokeWidth="3" />
          ))}
        </svg>
        <div className="mt-2 grid grid-cols-2 gap-3 text-[11px] text-[var(--on-surface-variant)]">
          <div className="min-w-0">
            <p className="truncate">{getTrendPointLabel(firstPoint, analytics, t)}</p>
            <p className="mt-1 font-semibold text-[var(--on-surface)]">{formatMetricValue(trend.metricKind, firstPoint.value, t)}</p>
          </div>
          <div className="min-w-0 text-right">
            <p className="truncate">{getTrendPointLabel(lastPoint, analytics, t)}</p>
            <p className="mt-1 font-semibold text-[var(--on-surface)]">{formatMetricValue(trend.metricKind, lastPoint.value, t)}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

function DistributionCard({ analytics }: { analytics: SummaryRangeAnalytics }) {
  const { t } = useTranslation()

  if (analytics.distribution.length === 0) {
    return null
  }

  return (
    <section className="mx-4 mt-3 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <h2 className="text-[16px] font-bold text-[var(--on-surface)]">{t('summary.analytics.distribution')}</h2>
      <div className="mt-3 flex flex-col gap-3">
        {analytics.distribution.map((item, index) => (
          <div key={item.muscleGroup} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-3">
            <span className="truncate text-[13px] font-medium text-[var(--on-surface)]">
              {item.muscleGroup === 'other'
                ? t('summary.analytics.otherDistribution')
                : getMuscleGroupName(t, item.muscleGroup)}
            </span>
            <div className="h-2.5 rounded-full bg-[var(--surface-container)]">
              <div
                className={[
                  'h-2.5 rounded-full',
                  index === 0 ? 'bg-[var(--plan-1)]' : '',
                  index === 1 ? 'bg-[var(--plan-2)]' : '',
                  index === 2 ? 'bg-[var(--plan-3)]' : '',
                  index > 2 ? 'bg-[var(--plan-5)]' : '',
                ].join(' ')}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            <span className="text-right text-[12px] font-semibold text-[var(--on-surface-variant)]">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function SummaryHighlightsCard({ analytics }: { analytics: SummaryRangeAnalytics | null }) {
  return analytics ? <HighlightsCard analytics={analytics} /> : null
}

export function SummaryAnalyticsSections({ analytics, isLoading }: SummaryAnalyticsSectionsProps) {
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
          {analytics?.range === 'month' ? t('summary.analytics.emptyMonthTitle') : t('summary.analytics.emptyWeekTitle')}
        </p>
        <p className="mt-2 text-sm leading-5 text-[var(--on-surface-variant)]">
          {t('summary.emptyDescription')}
        </p>
      </section>
    )
  }

  return (
    <>
      <OverviewCard analytics={analytics} />
      <TimeStatsCard analytics={analytics} />
      <HighlightsCard analytics={analytics} />
      <TrendCard analytics={analytics} />
      <ExerciseTrendCard analytics={analytics} />
      <DistributionCard analytics={analytics} />
    </>
  )
}
