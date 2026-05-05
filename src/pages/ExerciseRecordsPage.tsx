import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, Plus, Search, SlidersHorizontal } from 'lucide-react'

import { BottomSheet } from '../components/ui/BottomSheet'
import { ExerciseTrendChart } from '../components/exercise-records/ExerciseTrendChart'
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
  createCustomExerciseProfile,
  getExerciseRecordDetail,
  listExerciseRecordSummaries,
  resetExerciseProfileMuscleDistribution,
  saveExerciseProfileMuscleDistribution,
  type ExerciseRecordDetail,
  type ExerciseRecordMetric,
  type ExerciseRecordMetricKind,
  type ExerciseRecordSummary,
} from '../db/sessions'

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

function CustomExerciseSheet({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(t('summary.exerciseRecords.customNameRequired'))
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      const result = await createCustomExerciseProfile(trimmedName)
      if (result === 'empty') {
        setError(t('summary.exerciseRecords.customNameRequired'))
        return
      }
      if (result === 'exists') {
        setError(t('summary.exerciseRecords.customAlreadyExists'))
        return
      }

      setName('')
      onCreated()
      onClose()
    } catch (saveError) {
      console.error(saveError)
      setError(t('summary.exerciseRecords.customSaveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <BottomSheet
      open={isOpen}
      title={t('summary.exerciseRecords.addCustomTitle')}
      onClose={onClose}
    >
      <form className="mt-4 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
            {t('plans.exerciseName')}
          </span>
          <input
            value={name}
            disabled={isSaving}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
            placeholder={t('plans.exercisePlaceholder')}
          />
        </label>
        {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
        >
          {t('common.save')}
        </button>
      </form>
    </BottomSheet>
  )
}

function ExerciseRecordsListPage() {
  const { i18n, t } = useTranslation()
  const [items, setItems] = useState<ExerciseRecordSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const [query, setQuery] = useState('')

  async function reloadRecords() {
    try {
      setError(null)
      setIsLoading(true)
      const summaries = await listExerciseRecordSummaries()
      setItems(summaries)
    } catch (loadError) {
      console.error(loadError)
      setError(t('summary.exerciseRecords.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCancelled = false

    listExerciseRecordSummaries()
      .then((summaries) => {
        if (!isCancelled) {
          setItems(summaries)
        }
      })
      .catch((loadError) => {
        console.error(loadError)
        if (!isCancelled) {
          setError(t('summary.exerciseRecords.loadFailed'))
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

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
      <PageHeader
        title={t('summary.exerciseRecords.title')}
        backFallbackTo="/summary"
        actions={
          <button
            type="button"
            onClick={() => setIsCreateSheetOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
            aria-label={t('summary.exerciseRecords.addCustomTitle')}
          >
            <Plus size={22} strokeWidth={2.4} aria-hidden="true" />
          </button>
        }
      />

      <div className="mx-4 mt-3 flex h-12 items-center gap-3 rounded-2xl bg-[var(--surface-container)] px-4">
        <Search size={19} strokeWidth={2.2} className="shrink-0 text-[var(--on-surface-variant)]" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('summary.exerciseRecords.searchPlaceholder')}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--on-surface)] outline-none placeholder:text-[var(--on-surface-variant)]"
        />
      </div>
      <p className="mx-5 mt-2 text-[12px] font-medium text-[var(--on-surface-variant)]">
        {t('summary.exerciseRecords.totalCount', { count: items.length })}
      </p>

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
      {isCreateSheetOpen ? (
        <CustomExerciseSheet
          isOpen={isCreateSheetOpen}
          onClose={() => setIsCreateSheetOpen(false)}
          onCreated={() => void reloadRecords()}
        />
      ) : null}
    </div>
  )
}

function TrendCard({ detail }: { detail: ExerciseRecordDetail }) {
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
          <ExerciseTrendChart ariaLabel={title} points={series?.points ?? []} valueFormatter={valueFormatter} />
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-[var(--surface-container)] px-4 py-6 text-center text-sm text-[var(--on-surface-variant)]">
          {t('summary.exerciseRecords.trends.noData')}
        </p>
      )}
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
          <TrendCard detail={detail} />
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
