import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { TrainingHabitOverview } from '../components/summary/TrainingHabitOverview'
import { TrainingDurationOverview } from '../components/summary/TrainingDurationOverview'
import { PageHeader } from '../components/ui/PageHeader'
import { useTrainingGrowth } from '../hooks/pages/useTrainingGrowth'
import { useBackLinkState } from '../hooks/useRouteBack'
import { getDisplayExerciseName } from '../lib/exercise-name'
import { buildTrainingGrowth, growthStatus, representativeExercises } from '../lib/training-growth'
import { formatDistanceMeters, formatDurationSeconds } from '../lib/set-record-measurement'
import { formatWeightKg } from '../lib/weight-units'
import { getTodaySessionDateKey, isSessionDateKey } from '../lib/session-date-key'
import { SessionSummaryPage } from './SessionSummaryPage'

export function SummaryPage() {
  const { sessionId } = useParams()
  const [params] = useSearchParams()
  const date = params.get('date')
  return sessionId || isSessionDateKey(date)
    ? <SessionSummaryPage sessionId={sessionId} date={date ?? undefined} />
    : <GrowthPage />
}

function GrowthPage() {
  const { t } = useTranslation()
  const backLinkState = useBackLinkState()
  const today = getTodaySessionDateKey()
  const { snapshot, error, retry } = useTrainingGrowth()
  const growth = useMemo(() => snapshot ? buildTrainingGrowth(snapshot, today) : null, [snapshot, today])
  const featured = useMemo(() => representativeExercises(growth?.exercises ?? [], today), [growth, today])

  return (
    <>
      <PageHeader title={t('nav.summary')} titleAlign="center" />
      <div className="px-4 pb-4 pt-4 text-[var(--on-surface)]">
      {error ? (
        <div role="alert" className="rounded-2xl bg-[var(--error-container)] p-4 text-sm text-[var(--on-error-container)]">
          <p>{t('growth.loadFailed')}</p>
          <button type="button" className="mt-2 min-h-11 font-semibold" onClick={retry}>{t('growth.retry')}</button>
        </div>
      ) : !growth ? (
        <p role="status" className="py-8 text-sm text-[var(--on-surface-variant)]">{t('growth.loading')}</p>
      ) : (
        <>
          <TrainingDurationOverview points={growth.durationPoints} today={today} />
          <TrainingHabitOverview trainingDays={growth.trainingDays} dayColors={growth.trainingDayColors} today={today} />
          <section aria-labelledby="growth-performance">
            <div className="flex min-h-11 items-center justify-between gap-3">
              <h2 id="growth-performance" className="text-sm font-semibold">{t('growth.compact.progress')}</h2>
              <Link to="/summary/exercises" state={backLinkState} className="inline-flex min-h-11 items-center gap-1 text-xs text-[var(--on-surface-variant)]">
                {t('growth.compact.allExercises')}<ChevronRight size={14} aria-hidden="true" />
              </Link>
            </div>
            {featured.length ? (
              <div className="space-y-3">
                {featured.map((exercise) => {
                  const series = exercise.series[0]
                  const latest = series.points.at(-1)!
                  const status = growthStatus(exercise, today)
                  const isHigher = status === 'higher' || status === 'best'
                  let value = t('common.reps', { value: latest.value })
                  if (series.reps !== null) value = formatWeightKg(latest.value, t)
                  if (series.mode === 'duration') value = formatDurationSeconds(latest.value, t)
                  if (series.mode === 'distance') value = formatDistanceMeters(latest.value, t)

                  return (
                    <Link
                      key={exercise.id}
                      to={`/summary/exercises/${encodeURIComponent(exercise.id)}`}
                      state={backLinkState}
                      className="flex min-h-[76px] items-center justify-between gap-3 overflow-hidden rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-3 py-3 shadow-[0_2px_12px_-4px_color-mix(in_srgb,var(--on-surface)_5%,transparent)] active:bg-[var(--surface-container)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold">{getDisplayExerciseName(t, exercise)}</p>
                        <p className={`mt-1 text-xs ${isHigher ? 'text-[var(--plan-3)]' : 'text-[var(--on-surface-variant)]'}`}>
                          {t(`growth.compact.status.${status}`)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold tabular-nums tracking-tight">{value}</p>
                        {series.reps !== null && (
                          <p className="mt-0.5 text-xs text-[var(--on-surface-variant)]">
                            {series.side && <>{t(`growth.side.${series.side}`)} · </>}
                            {t('common.reps', { value: series.reps })}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-[var(--on-surface-variant)]" aria-hidden="true" />
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="py-5">
                <p className="text-sm text-[var(--on-surface-variant)]">{t('growth.compact.empty')}</p>
                <Link to="/" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold">{t('summary.backToSchedule')}</Link>
              </div>
            )}
          </section>
        </>
      )}
      <Link to="/calendar" state={backLinkState} className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl text-sm font-medium active:bg-[var(--surface-container)]">
        <CalendarDays size={19} className="text-[var(--on-surface-variant)]" aria-hidden="true" />
        <span className="flex-1">{t('growth.compact.history')}</span>
        <ChevronRight size={16} className="text-[var(--on-surface-variant)]" aria-hidden="true" />
      </Link>
      </div>
    </>
  )
}
