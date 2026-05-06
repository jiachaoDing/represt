import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getMuscleGroupName } from '../../lib/exercise-catalog-i18n'
import { formatNumber } from '../../lib/set-record-measurement'
import type { ExerciseRecordDetail, ExerciseRecordMetric } from '../../db/sessions'
import { MetricValue } from './MetricValue'
import { formatMetricValue } from './utils'

const ExerciseTrendChart = lazy(() =>
  import('../../components/exercise-records/ExerciseTrendChart').then((module) => ({
    default: module.ExerciseTrendChart,
  })),
)

const trendKinds = ['personalBest', 'bestSet', 'volume', 'frequency'] as const
type DefaultTrendKind = (typeof trendKinds)[number]

const trendTextKeys: Record<DefaultTrendKind, { label: string; title: string; description: string }> = {
  personalBest: {
    label: 'summary.exerciseRecords.trends.personalBest',
    title: 'summary.exerciseRecords.trends.personalBestTitle',
    description: 'summary.exerciseRecords.trends.personalBestDescription',
  },
  bestSet: {
    label: 'summary.exerciseRecords.trends.bestSet',
    title: 'summary.exerciseRecords.trends.bestSetTitle',
    description: 'summary.exerciseRecords.trends.bestSetDescription',
  },
  volume: {
    label: 'summary.exerciseRecords.trends.volume',
    title: 'summary.exerciseRecords.trends.volumeTitle',
    description: 'summary.exerciseRecords.trends.volumeDescription',
  },
  frequency: {
    label: 'summary.exerciseRecords.trends.frequency',
    title: 'summary.exerciseRecords.trends.frequencyTitle',
    description: 'summary.exerciseRecords.trends.frequencyDescription',
  },
}

export function TrendCard({ detail }: { detail: ExerciseRecordDetail }) {
  const { t } = useTranslation()
  const [selectedTrend, setSelectedTrend] = useState<DefaultTrendKind>('personalBest')
  const series = detail.trendSeries.find((item) => item.kind === selectedTrend) ?? null
  const textKeys = trendTextKeys[selectedTrend]
  const title = t(textKeys.title)
  const valueFormatter = (value: number) => {
    if (selectedTrend === 'frequency') {
      return formatNumber(value)
    }

    return formatMetricValue(series?.metricKind ?? 'highestWeight', value, t)
  }

  return (
    <section className="mx-4 mt-3 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[var(--on-surface-variant)]">
            {t('summary.exerciseRecords.trends.title')}
          </p>
          <h2 className="mt-1 text-[16px] font-bold text-[var(--on-surface)]">{title}</h2>
        </div>
        {series?.latestValue !== null && series?.latestValue !== undefined ? (
          <p className="shrink-0 text-[13px] font-semibold text-[var(--primary)]">
            {valueFormatter(series.latestValue)}
          </p>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1 rounded-2xl bg-[var(--surface-container)] p-1">
        {trendKinds.map((kind) => {
          const isSelected = kind === selectedTrend

          return (
            <button
              key={kind}
              type="button"
              onClick={() => setSelectedTrend(kind)}
              className={[
                'min-w-0 rounded-xl px-2 py-2 text-[12px] font-semibold transition-colors',
                isSelected
                  ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                  : 'text-[var(--on-surface-variant)]',
              ].join(' ')}
            >
              {t(trendTextKeys[kind].label)}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-[12px] text-[var(--on-surface-variant)]">{t(textKeys.description)}</p>
      {(series?.points.length ?? 0) > 0 ? (
        <div className="mt-3">
          <Suspense fallback={<div className="h-48 w-full" aria-hidden="true" />}>
            <ExerciseTrendChart ariaLabel={title} points={series?.points ?? []} valueFormatter={valueFormatter} />
          </Suspense>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-[var(--surface-container)] px-4 py-6 text-center text-sm text-[var(--on-surface-variant)]">
          {t('summary.exerciseRecords.trends.noData')}
        </p>
      )}
    </section>
  )
}

export function MuscleDistributionCard({ detail }: { detail: ExerciseRecordDetail }) {
  const { t } = useTranslation()
  const distribution = detail.muscleDistribution

  return (
    <section className="mx-4 mt-3 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <h2 className="text-[16px] font-bold text-[var(--on-surface)]">{t('summary.exerciseRecords.muscleDistribution')}</h2>

      {distribution.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--on-surface-variant)]">{t('summary.exerciseRecords.noDistribution')}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {distribution.map((item, index) => {
            const percentage = Math.round(item.ratio * 100)
            return (
              <div key={item.muscleGroupId} className="grid grid-cols-[4rem_1fr_2.75rem] items-center gap-3">
                <span className="truncate text-[13px] font-medium text-[var(--on-surface)]">
                  {getMuscleGroupName(t, item.muscleGroupId)}
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
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-right text-[12px] font-semibold text-[var(--on-surface-variant)]">
                  {percentage}%
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export function MetricCards({ detail }: { detail: ExerciseRecordDetail }) {
  const { t } = useTranslation()
  const metrics = [detail.primaryMetric, ...detail.secondaryMetrics]
    .filter((metric): metric is ExerciseRecordMetric => metric !== null)

  return (
    <section className="mx-4 mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-[1.25rem] bg-[var(--primary-container)] p-4 text-[var(--on-primary-container)]">
        <p className="text-[12px] font-semibold">{t('summary.exerciseRecords.primaryPb')}</p>
        <p className="mt-2 text-[20px] font-bold"><MetricValue metric={detail.primaryMetric} /></p>
      </div>
      <div className="rounded-[1.25rem] bg-[var(--surface-container)] p-4">
        <p className="text-[12px] font-semibold text-[var(--on-surface-variant)]">{t('summary.exerciseRecords.completedSets')}</p>
        <p className="mt-2 text-[20px] font-bold text-[var(--on-surface)]">
          {t('common.sets', { value: detail.completedSets })}
        </p>
      </div>
      {metrics.slice(1, 3).map((metric) => (
        <div key={metric.kind} className="rounded-[1.25rem] bg-[var(--surface-container)] p-4">
          <p className="text-[12px] font-semibold text-[var(--on-surface-variant)]">
            {t(`summary.analytics.metrics.${metric.kind}`)}
          </p>
          <p className="mt-2 text-[18px] font-bold text-[var(--on-surface)]">
            {formatMetricValue(metric.kind, metric.value, t)}
          </p>
        </div>
      ))}
    </section>
  )
}
