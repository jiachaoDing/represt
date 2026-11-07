import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Edit3 } from 'lucide-react'

import { PageHeader } from '../../components/ui/PageHeader'
import { getDisplayExerciseName } from '../../lib/exercise-name'
import { formatSetRecordValue } from '../../lib/set-record-measurement'
import { formatSessionDateKey } from '../../lib/session-date-key'
import {
  getExerciseRecordDetail,
  type ExerciseRecordDetail,
} from '../../db/sessions'
import { MetricCards, MuscleDistributionCard, TrendCard } from './components'
import { formatTotalWork } from './utils'

export function ExerciseRecordDetailPage({ profileId }: { profileId: string }) {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<ExerciseRecordDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  const editToken = detail?.profileId.startsWith('catalog:')
    ? `change:${detail.profileId.slice('catalog:'.length)}`
    : `change:${detail?.profileId ?? profileId}`

  return (
    <div className="pb-4">
      <PageHeader
        title={displayName}
        backFallbackTo="/summary/exercises"
        actions={detail ? (
          <button
            type="button"
            onClick={() => navigate(`/summary/exercises/catalog/${encodeURIComponent(editToken)}`)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
            aria-label={t('summary.exerciseRecords.editModel')}
          >
            <Edit3 size={20} strokeWidth={2.3} aria-hidden="true" />
          </button>
        ) : null}
      />

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

          <MuscleDistributionCard detail={detail} />

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
        </>
      ) : null}
    </div>
  )
}
