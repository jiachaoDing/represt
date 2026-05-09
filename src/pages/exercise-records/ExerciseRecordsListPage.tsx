import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Search } from 'lucide-react'

import { PageHeader } from '../../components/ui/PageHeader'
import { useBackLinkState } from '../../hooks/useRouteBack'
import { getExerciseAliases } from '../../lib/exercise-catalog-i18n'
import { getDisplayExerciseName } from '../../lib/exercise-name'
import {
  listExerciseRecordSummaries,
  type ExerciseRecordSummary,
} from '../../db/sessions'
import { MetricValue } from './MetricValue'

export function ExerciseRecordsListPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const backLinkState = useBackLinkState()
  const [items, setItems] = useState<ExerciseRecordSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

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
            onClick={() => navigate('/summary/exercises/catalog/new', { state: backLinkState })}
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
                state={backLinkState}
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
