import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { SessionSummaryDetail } from '../../db/sessions'
import type { SetRecord } from '../../models/types'

type SessionExerciseSummaryListProps = {
  detail: SessionSummaryDetail | null
}

const maxDotCount = 10

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(/\.0$/, '')
}

function formatSetRecordValue(setRecord: SetRecord, t: ReturnType<typeof useTranslation>['t']) {
  if (setRecord.weightKg === null && setRecord.reps === null) {
    return t('summary.completedValue')
  }

  if (setRecord.weightKg !== null && setRecord.reps !== null) {
    return `${formatNumber(setRecord.weightKg)}kg × ${setRecord.reps}`
  }

  if (setRecord.weightKg !== null) {
    return `${formatNumber(setRecord.weightKg)}kg`
  }

  return t('common.reps', { value: setRecord.reps })
}

function getRecordSummary(setRecords: SetRecord[], t: ReturnType<typeof useTranslation>['t']) {
  const weights = setRecords
    .map((setRecord) => setRecord.weightKg)
    .filter((weightKg): weightKg is number => weightKg !== null)
  const reps = setRecords
    .map((setRecord) => setRecord.reps)
    .filter((repCount): repCount is number => repCount !== null)
  const parts: string[] = []

  if (weights.length > 0) {
    parts.push(t('summary.highestWeight', { weight: formatNumber(Math.max(...weights)) }))
  }

  if (reps.length > 0) {
    parts.push(t('summary.totalReps', { reps: reps.reduce((acc, repCount) => acc + repCount, 0) }))
  }

  return parts.join(' · ')
}

function SetCompletionDots({ completedSets }: { completedSets: number }) {
  if (completedSets <= 0) {
    return null
  }

  const visibleDotCount = Math.min(completedSets, maxDotCount)

  return (
    <div className="mt-4 flex items-center gap-1.5">
      {Array.from({ length: visibleDotCount }).map((_, index) => (
        <span key={index} className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
      ))}
      {completedSets > maxDotCount ? (
        <span className="ml-1 text-[12px] font-medium text-[var(--primary)]">
          +{completedSets - maxDotCount}
        </span>
      ) : null}
    </div>
  )
}

export function SessionExerciseSummaryList({ detail }: SessionExerciseSummaryListProps) {
  const { t } = useTranslation()

  if (!detail) {
    return null
  }

  if (detail.exercises.length === 0) {
    return (
      <div className="mx-4 mt-8">
        <p className="text-[var(--on-surface-variant)]">
          {t('summary.emptyTitle')}。{t('summary.emptyDescription')}
        </p>
      </div>
    )
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="text-[16px] font-bold text-[var(--on-surface)]">{t('summary.exerciseCompleted')}</h2>
        <span className="text-[12px] font-medium text-[var(--on-surface-variant)]">
          {t('summary.exerciseCount', { count: detail.exercises.length })}
        </span>
      </div>

      <div className="flex flex-col gap-3 px-4">
        {detail.exercises.map((exercise) => {
          const recordSummary = getRecordSummary(exercise.setRecords, t)

          return (
            <details
              key={exercise.id}
              className="group rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]"
            >
              <summary className="list-none cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-[16px] font-bold text-[var(--on-surface)]">
                      {exercise.name}
                    </h4>
                  </div>

                  <span className="shrink-0 rounded-full bg-[var(--primary-container)] px-3 py-1 text-[12px] font-semibold text-[var(--on-primary-container)]">
                    {t('common.sets', { value: exercise.completedSets })}
                  </span>
                </div>

                <SetCompletionDots completedSets={exercise.completedSets} />

                {recordSummary ? (
                  <p className="mt-3 text-[13px] leading-5 text-[var(--on-surface-variant)]">
                    {recordSummary}
                  </p>
                ) : null}
              </summary>

              <div className="mt-4 border-t border-[var(--outline-variant)]/20 pt-3">
                {exercise.setRecords.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {exercise.setRecords.map((setRecord) => (
                      <div key={setRecord.id} className="flex items-center text-[14px]">
                        <div className="w-14 text-[var(--on-surface-variant)]">
                          {t('summary.setNumber', { setNumber: setRecord.setNumber })}
                        </div>
                        <div className="flex-1 pl-4 font-medium text-[var(--on-surface)]">
                          {formatSetRecordValue(setRecord, t)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-[var(--on-surface-variant)]">{t('summary.noCompletedSets')}</p>
                )}
              </div>
            </details>
          )
        })}
      </div>

      <div className="mt-8 px-4 pb-12 flex justify-center">
        <Link 
          to="/" 
          className="inline-flex h-12 w-full max-w-[200px] items-center justify-center rounded-xl bg-[var(--surface-container)] text-[15px] font-medium text-[var(--on-surface)] transition-colors tap-highlight-transparent active:scale-[0.98]"
        >
          {t('summary.backToSchedule')}
        </Link>
      </div>
    </section>
  )
}
