import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { getCompletedAtLabel } from '../../lib/session-display'

type ExerciseRecordInlineCardProps = {
  isSubmitting: boolean
  latestSetRecord: {
    completedAt: string
    setNumber: number
  } | null
  repsInput: string
  weightInput: string
  onCancel: () => void
  onRepsChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onWeightChange: (value: string) => void
}

export function ExerciseRecordInlineCard({
  isSubmitting,
  latestSetRecord,
  repsInput,
  weightInput,
  onCancel,
  onRepsChange,
  onSubmit,
  onWeightChange,
}: ExerciseRecordInlineCardProps) {
  const { i18n, t } = useTranslation()

  return (
    <section className="mx-4 mt-3 rounded-[1.5rem] border border-[var(--outline-variant)]/30 bg-[var(--surface)] px-5 py-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-semibold text-[var(--on-surface)]">{t('exercise.recordTitle')}</h2>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--on-surface-variant)]/10"
          aria-label={t('common.cancel')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {latestSetRecord ? (
        <form className="mt-5 space-y-5" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--surface-container)] px-4 py-3">
              <p className="text-xs font-medium text-[var(--on-surface-variant)]">{t('exercise.setIndex')}</p>
              <p className="mt-1 text-sm font-medium text-[var(--on-surface)]">
                {t('summary.setNumber', { setNumber: latestSetRecord.setNumber })}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--surface-container)] px-4 py-3">
              <p className="text-xs font-medium text-[var(--on-surface-variant)]">{t('exercise.completedAt')}</p>
              <p className="mt-1 text-sm font-medium text-[var(--on-surface)]">
                {getCompletedAtLabel(latestSetRecord.completedAt, i18n.resolvedLanguage)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
                {t('exercise.weightKg')}
              </span>
              <input
                type="number"
                min={0}
                step="0.5"
                inputMode="decimal"
                value={weightInput}
                disabled={isSubmitting}
                onChange={(event) => onWeightChange(event.target.value)}
                className="w-full rounded-none border-b border-[var(--on-surface)] bg-transparent px-1 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)] disabled:opacity-50"
              />
            </label>

            <label className="block">
              <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
                {t('exercise.reps')}
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={repsInput}
                disabled={isSubmitting}
                onChange={(event) => onRepsChange(event.target.value)}
                className="w-full rounded-none border-b border-[var(--on-surface)] bg-transparent px-1 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)] disabled:opacity-50"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[var(--primary)] px-6 py-3.5 text-[15px] font-semibold text-[var(--on-primary)] shadow-[0_4px_12px_rgba(22,78,48,0.18)] transition-opacity disabled:opacity-40"
          >
            {t('exercise.saveRecord')}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-[var(--on-surface-variant)]">{t('exercise.noSetRecord')}</p>
      )}
    </section>
  )
}
