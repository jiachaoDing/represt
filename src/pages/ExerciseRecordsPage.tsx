import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, Search, SlidersHorizontal } from 'lucide-react'

import { BottomSheet } from '../components/ui/BottomSheet'
import { PageHeader } from '../components/ui/PageHeader'
import { muscleGroups, type MuscleDistributionItem } from '../domain/exercise-catalog'
import {
  getMuscleGroupName,
  getExerciseAliases,
} from '../lib/exercise-catalog-i18n'
import { getDisplayExerciseName } from '../lib/exercise-name'
import {
  formatDistanceMeters,
  formatDurationSeconds,
  formatNumber,
  formatSetRecordValue,
} from '../lib/set-record-measurement'
import { formatSessionDateKey } from '../lib/session-date-key'
import {
  getExerciseRecordDetail,
  listExerciseRecordSummaries,
  resetExerciseProfileMuscleDistribution,
  saveExerciseProfileMuscleDistribution,
  type ExerciseRecordDetail,
  type ExerciseRecordMetric,
  type ExerciseRecordMetricKind,
  type ExerciseRecordSummary,
} from '../db/sessions'

function formatMetricValue(kind: ExerciseRecordMetricKind, value: number, t: ReturnType<typeof useTranslation>['t']) {
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

function MetricValue({ metric }: { metric: ExerciseRecordMetric | null }) {
  const { t } = useTranslation()

  return (
    <span>
      {metric ? formatMetricValue(metric.kind, metric.value, t) : t('summary.exerciseRecords.noPb')}
    </span>
  )
}

function formatTotalWork(detail: ExerciseRecordDetail, t: ReturnType<typeof useTranslation>['t']) {
  if (detail.measurementType === 'duration') {
    return formatDurationSeconds(detail.totalDurationSeconds, t)
  }
  if (detail.measurementType === 'distance') {
    return formatDistanceMeters(detail.totalDistanceMeters, t)
  }
  if (detail.measurementType === 'weightDistance') {
    return formatMetricValue('loadDistanceVolume', detail.totalVolume, t)
  }
  if (detail.measurementType === 'reps') {
    return t('common.reps', { value: detail.totalReps })
  }

  return formatMetricValue('weightRepsVolume', detail.totalVolume, t)
}

function ExerciseRecordsListPage() {
  const { i18n, t } = useTranslation()
  const [items, setItems] = useState<ExerciseRecordSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let isCancelled = false

    async function loadRecords() {
      try {
        setError(null)
        setIsLoading(true)
        const summaries = await listExerciseRecordSummaries()
        if (!isCancelled) {
          setItems(summaries)
        }
      } catch (loadError) {
        console.error(loadError)
        if (!isCancelled) {
          setError(t('summary.exerciseRecords.loadFailed'))
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadRecords()
    return () => {
      isCancelled = true
    }
  }, [t])

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.normalize('NFKC').trim().toLowerCase()

    return items
      .filter((item) => {
        if (!normalizedQuery) {
          return true
        }

        const displayName = getDisplayExerciseName(t, item)
        const aliases = item.catalogExerciseId ? getExerciseAliases(t, item.catalogExerciseId) : []
        return [displayName, item.name, ...aliases]
          .join(' ')
          .normalize('NFKC')
          .toLowerCase()
          .includes(normalizedQuery)
      })
      .sort((left, right) => {
        const leftHasRecords = left.completedSets > 0
        const rightHasRecords = right.completedSets > 0
        if (leftHasRecords !== rightHasRecords) {
          return leftHasRecords ? -1 : 1
        }
        if (leftHasRecords && rightHasRecords) {
          return (right.latestCompletedAt ?? '').localeCompare(left.latestCompletedAt ?? '')
        }

        return getDisplayExerciseName(t, left).localeCompare(
          getDisplayExerciseName(t, right),
          i18n.resolvedLanguage,
        )
      })
  }, [i18n.resolvedLanguage, items, query, t])

  return (
    <div className="pb-4">
      <PageHeader title={t('summary.exerciseRecords.title')} backFallbackTo="/summary" />

      <div className="mx-4 mt-3 flex h-12 items-center gap-3 rounded-2xl bg-[var(--surface-container)] px-4">
        <Search size={19} strokeWidth={2.2} className="shrink-0 text-[var(--on-surface-variant)]" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('summary.exerciseRecords.searchPlaceholder')}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--on-surface)] outline-none placeholder:text-[var(--on-surface-variant)]"
        />
      </div>

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mx-4 mt-4 h-48 rounded-[1.25rem] bg-[var(--surface-container)] opacity-60 animate-pulse" />
      ) : (
        <div className="mt-4 flex flex-col gap-3 px-4">
          {visibleItems.map((item) => {
            const displayName = getDisplayExerciseName(t, item)
            return (
              <Link
                key={item.profileId}
                to={`/summary/exercises/${encodeURIComponent(item.profileId)}`}
                viewTransition
                className="rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[16px] font-bold text-[var(--on-surface)]">{displayName}</h2>
                    <p className="mt-1 text-[12px] text-[var(--on-surface-variant)]">
                      {item.completedSets > 0
                        ? t('summary.exerciseRecords.listStats', {
                            days: item.trainingDays,
                            sets: item.completedSets,
                          })
                        : t('summary.exerciseRecords.noRecords')}
                    </p>
                  </div>
                  <ChevronRight size={20} strokeWidth={2.2} className="mt-1 shrink-0 text-[var(--on-surface-variant)]" aria-hidden="true" />
                </div>
                <div className="mt-3 inline-flex rounded-full bg-[var(--primary-container)] px-3 py-1 text-[12px] font-semibold text-[var(--on-primary-container)]">
                  <MetricValue metric={item.primaryMetric} />
                </div>
              </Link>
            )
          })}
          {visibleItems.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-[var(--outline-variant)]/40 bg-[var(--surface)] px-5 py-8 text-center">
              <p className="text-sm font-medium text-[var(--on-surface-variant)]">
                {t('summary.exerciseRecords.emptySearch')}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function TrendChart({ detail }: { detail: ExerciseRecordDetail }) {
  const { i18n, t } = useTranslation()
  const points = detail.trendPoints
  const [selectedPointKey, setSelectedPointKey] = useState<string | null>(null)
  const maxValue = Math.max(...points.map((point) => point.value), 1)
  const minValue = Math.min(...points.map((point) => point.value), 0)
  const valueRange = Math.max(maxValue - minValue, 1)
  const width = 320
  const height = 144
  const paddingLeft = 58
  const paddingRight = 12
  const paddingTop = 18
  const paddingBottom = 24
  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom
  const yAxisTicks = [maxValue, minValue + valueRange / 2, minValue]
  const coordinates = points.map((point, index) => {
    const x = points.length === 1
      ? paddingLeft + chartWidth / 2
      : paddingLeft + (index / (points.length - 1)) * chartWidth
    const y = paddingTop + ((maxValue - point.value) / valueRange) * chartHeight
    return { ...point, x, y }
  })
  const path = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const selectedPoint = coordinates.find((point) => point.key === selectedPointKey) ?? null
  const primaryMetricKind = detail.primaryMetric?.kind ?? 'highestWeight'

  if (points.length === 0) {
    return (
      <section className="mx-4 mt-3 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4">
        <h2 className="text-[16px] font-bold text-[var(--on-surface)]">{t('summary.exerciseRecords.pbTrend')}</h2>
        <p className="mt-3 text-sm text-[var(--on-surface-variant)]">{t('summary.exerciseRecords.noTrend')}</p>
      </section>
    )
  }

  return (
    <section className="mx-4 mt-3 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold text-[var(--on-surface)]">{t('summary.exerciseRecords.pbTrend')}</h2>
          <p className="mt-1 text-[12px] text-[var(--on-surface-variant)]">
            {t(`summary.analytics.metrics.${primaryMetricKind}`)}
          </p>
        </div>
        <p className="shrink-0 text-[13px] font-semibold text-[var(--primary)]">
          <MetricValue metric={detail.primaryMetric} />
        </p>
      </div>
      <div className="relative mt-4">
        <svg className="h-40 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('summary.exerciseRecords.pbTrend')}>
          {yAxisTicks.map((tick, index) => {
            const y = paddingTop + ((maxValue - tick) / valueRange) * chartHeight

            return (
              <g key={`${tick}:${index}`}>
                <path
                  d={`M ${paddingLeft} ${y} H ${width - paddingRight}`}
                  fill="none"
                  stroke="var(--outline-variant)"
                  strokeWidth="1"
                  strokeOpacity={tick === minValue ? 0.9 : 0.45}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  fill="var(--on-surface-variant)"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="end"
                >
                  {formatMetricValue(primaryMetricKind, tick, t)}
                </text>
              </g>
            )
          })}
          <path d={`M ${paddingLeft} ${paddingTop} V ${height - paddingBottom}`} fill="none" stroke="var(--outline-variant)" strokeWidth="1" />
          {path ? <path d={path} fill="none" stroke="var(--plan-1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" /> : null}
          {coordinates.map((point) => {
            const isSelected = point.key === selectedPointKey

            return (
              <g
                key={point.key}
                role="button"
                tabIndex={0}
                aria-label={t('summary.exerciseRecords.trendPointLabel', {
                  date: formatSessionDateKey(point.key, { month: 'short', day: 'numeric' }, i18n.resolvedLanguage),
                  value: formatMetricValue(primaryMetricKind, point.value, t),
                })}
                className="cursor-pointer outline-none"
                onClick={() => setSelectedPointKey(isSelected ? null : point.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedPointKey(isSelected ? null : point.key)
                  }
                }}
              >
                <circle cx={point.x} cy={point.y} r="12" fill="transparent" />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isSelected ? '6' : '4'}
                  fill="var(--surface)"
                  stroke="var(--plan-1)"
                  strokeWidth={isSelected ? '4' : '3'}
                />
              </g>
            )
          })}
        </svg>
        {selectedPoint ? (
          <div
            className="pointer-events-none absolute z-10 min-w-24 -translate-x-1/2 rounded-xl bg-[var(--surface-container-high)] px-3 py-2 text-center shadow-lg ring-1 ring-[var(--outline-variant)]/30"
            style={{
              left: `${(selectedPoint.x / width) * 100}%`,
              top: `${Math.max((selectedPoint.y / height) * 100 - 24, 0)}%`,
            }}
          >
            <p className="text-[11px] font-medium text-[var(--on-surface-variant)]">
              {formatSessionDateKey(selectedPoint.key, { month: 'short', day: 'numeric' }, i18n.resolvedLanguage)}
            </p>
            <p className="mt-0.5 text-[13px] font-bold text-[var(--on-surface)]">
              {formatMetricValue(primaryMetricKind, selectedPoint.value, t)}
            </p>
          </div>
        ) : null}
      </div>
      <div className="mt-1 flex justify-between gap-3 text-[11px] text-[var(--on-surface-variant)]">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </section>
  )
}

function MuscleDistributionCard({
  detail,
  onEdit,
}: {
  detail: ExerciseRecordDetail
  onEdit: () => void
}) {
  const { t } = useTranslation()
  const distribution = detail.muscleDistribution

  return (
    <section className="mx-4 mt-3 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-bold text-[var(--on-surface)]">{t('summary.exerciseRecords.muscleDistribution')}</h2>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-9 items-center gap-1 rounded-xl px-2 text-[13px] font-semibold text-[var(--primary)]"
        >
          <SlidersHorizontal size={16} strokeWidth={2.2} aria-hidden="true" />
          {t('common.edit')}
        </button>
      </div>

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

function MetricCards({ detail }: { detail: ExerciseRecordDetail }) {
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

function toDistributionInputs(distribution: MuscleDistributionItem[]) {
  const values = new Map(distribution.map((item) => [item.muscleGroupId, String(Math.round(item.ratio * 100))]))
  return Object.fromEntries(muscleGroups.map((groupId) => [groupId, values.get(groupId) ?? '']))
}

function normalizeDistributionInputs(inputs: Record<string, string>) {
  const rawItems = muscleGroups
    .map((muscleGroupId) => ({
      muscleGroupId,
      value: Number(inputs[muscleGroupId]),
    }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
  const total = rawItems.reduce((sum, item) => sum + item.value, 0)

  if (total <= 0) {
    return []
  }

  return rawItems.map((item) => ({
    muscleGroupId: item.muscleGroupId,
    ratio: item.value / total,
  })) satisfies MuscleDistributionItem[]
}

function MuscleDistributionSheet({
  detail,
  isOpen,
  onClose,
  onSaved,
}: {
  detail: ExerciseRecordDetail
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [inputs, setInputs] = useState(() => toDistributionInputs(detail.muscleDistribution))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const muscleDistribution = normalizeDistributionInputs(inputs)
    if (muscleDistribution.length === 0) {
      setError(t('summary.exerciseRecords.distributionRequired'))
      return
    }

    try {
      setIsSaving(true)
      await saveExerciseProfileMuscleDistribution({
        catalogExerciseId: detail.catalogExerciseId,
        muscleDistribution,
        name: detail.name,
        profileId: detail.profileId,
      })
      onSaved()
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReset() {
    try {
      setIsSaving(true)
      await resetExerciseProfileMuscleDistribution(detail.profileId)
      onSaved()
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <BottomSheet
      open={isOpen}
      title={t('summary.exerciseRecords.editDistribution')}
      description={t('summary.exerciseRecords.editDistributionDescription')}
      onClose={onClose}
    >
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          {muscleGroups.map((groupId) => (
            <label key={groupId} className="block">
              <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
                {getMuscleGroupName(t, groupId)}
              </span>
              <input
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                value={inputs[groupId]}
                disabled={isSaving}
                onChange={(event) => setInputs({ ...inputs, [groupId]: event.target.value })}
                className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
                placeholder={t('summary.exerciseRecords.percentPlaceholder')}
              />
            </label>
          ))}
        </div>
        {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            disabled={isSaving || !detail.hasMuscleDistributionOverride}
            onClick={() => void handleReset()}
            className="inline-flex h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold text-[var(--primary)] transition-opacity disabled:opacity-35"
          >
            {t('summary.exerciseRecords.resetDistribution')}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-40"
          >
            {t('common.save')}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}

function ExerciseRecordDetailPage({ profileId }: { profileId: string }) {
  const { i18n, t } = useTranslation()
  const [detail, setDetail] = useState<ExerciseRecordDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDistributionOpen, setIsDistributionOpen] = useState(false)

  async function loadDetail() {
    try {
      setError(null)
      setIsLoading(true)
      const result = await getExerciseRecordDetail(profileId)
      setDetail(result)
    } catch (loadError) {
      console.error(loadError)
      setError(t('summary.exerciseRecords.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCancelled = false

    async function loadInitialDetail() {
      try {
        setError(null)
        setIsLoading(true)
        const result = await getExerciseRecordDetail(profileId)
        if (!isCancelled) {
          setDetail(result)
        }
      } catch (loadError) {
        console.error(loadError)
        if (!isCancelled) {
          setError(t('summary.exerciseRecords.loadFailed'))
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialDetail()
    return () => {
      isCancelled = true
    }
  }, [profileId, t])

  const displayName = detail ? getDisplayExerciseName(t, detail) : t('summary.exerciseRecords.detailTitle')

  return (
    <div className="pb-4">
      <PageHeader title={displayName} backFallbackTo="/summary/exercises" />

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mx-4 mt-4 h-64 rounded-[1.25rem] bg-[var(--surface-container)] opacity-60 animate-pulse" />
      ) : null}

      {!isLoading && !detail ? (
        <section className="mx-4 mt-6 rounded-[1.25rem] border border-dashed border-[var(--outline-variant)]/40 bg-[var(--surface)] px-5 py-8 text-center">
          <p className="text-base font-semibold text-[var(--on-surface)]">{t('summary.exerciseRecords.notFound')}</p>
        </section>
      ) : null}

      {detail ? (
        <>
          <MetricCards detail={detail} />
          <TrendChart detail={detail} />
          <section className="mx-4 mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-[1.25rem] bg-[var(--surface-container)] p-4">
              <p className="text-[12px] font-semibold text-[var(--on-surface-variant)]">{t('summary.exerciseRecords.trainingDays')}</p>
              <p className="mt-2 text-[18px] font-bold text-[var(--on-surface)]">
                {t('summary.analytics.daysValue', { value: detail.trainingDays })}
              </p>
            </div>
            <div className="rounded-[1.25rem] bg-[var(--surface-container)] p-4">
              <p className="text-[12px] font-semibold text-[var(--on-surface-variant)]">{t('summary.exerciseRecords.totalVolume')}</p>
              <p className="mt-2 text-[18px] font-bold text-[var(--on-surface)]">
                {formatTotalWork(detail, t)}
              </p>
            </div>
          </section>

          <MuscleDistributionCard detail={detail} onEdit={() => setIsDistributionOpen(true)} />

          <section className="mx-4 mt-3 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
            <h2 className="text-[16px] font-bold text-[var(--on-surface)]">{t('summary.exerciseRecords.history')}</h2>
            {detail.history.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--on-surface-variant)]">{t('summary.exerciseRecords.noRecords')}</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {detail.history.slice(0, 30).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-container)] px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--on-surface)]">
                        {formatSetRecordValue(item.setRecord, detail.measurementType, t)}
                      </p>
                      <p className="mt-1 text-[12px] text-[var(--on-surface-variant)]">
                        {t('summary.setNumber', { setNumber: item.setNumber })}
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-[12px] font-medium text-[var(--on-surface-variant)]">
                      {formatSessionDateKey(item.sessionDateKey, { month: 'short', day: 'numeric' }, i18n.resolvedLanguage)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {isDistributionOpen ? (
            <MuscleDistributionSheet
              detail={detail}
              isOpen={isDistributionOpen}
              onClose={() => setIsDistributionOpen(false)}
              onSaved={() => void loadDetail()}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export function ExerciseRecordsPage() {
  const { profileId } = useParams()

  if (profileId) {
    return <ExerciseRecordDetailPage profileId={decodeURIComponent(profileId)} />
  }

  return <ExerciseRecordsListPage />
}
