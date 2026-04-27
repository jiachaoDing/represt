import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { BottomSheet } from '../ui/BottomSheet'
import { getCompletedAtLabel } from '../../lib/session-display'

type ExerciseRecordSheetProps = {
  isOpen: boolean
  isSubmitting: boolean
  latestSetRecord: {
    completedAt: string
    setNumber: number
  } | null
  repsInput: string
  weightInput: string
  onClose: () => void
  onRepsChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onWeightChange: (value: string) => void
}

export function ExerciseRecordSheet({
  isOpen,
  isSubmitting,
  latestSetRecord,
  repsInput,
  weightInput,
  onClose,
  onRepsChange,
  onSubmit,
  onWeightChange,
}: ExerciseRecordSheetProps) {
  const { i18n, t } = useTranslation()

  return (
    <BottomSheet open={isOpen} title={t('exercise.recordSheetTitle')} onClose={onClose}>
      {latestSetRecord ? (
        <div className="mt-2 space-y-5">
          <div className="mb-2 flex gap-4">
            <div className="flex-1 rounded-xl bg-[var(--surface-container)] px-4 py-3">
              <p className="text-xs font-medium text-[var(--on-surface-variant)]">{t('exercise.setIndex')}</p>
              <p className="mt-1 text-sm font-medium text-[var(--on-surface)]">
                {t('summary.setNumber', { setNumber: latestSetRecord.setNumber })}
              </p>
            </div>
            <div className="flex-1 rounded-xl bg-[var(--surface-container)] px-4 py-3">
              <p className="text-xs font-medium text-[var(--on-surface-variant)]">{t('exercise.completedAt')}</p>
              <p className="mt-1 text-sm font-medium text-[var(--on-surface)]">
                {getCompletedAtLabel(latestSetRecord.completedAt, i18n.resolvedLanguage)}
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
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
                  className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
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
                  className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
                />
              </label>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
              >
                {t('exercise.saveRecord')}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--on-surface-variant)]">{t('exercise.noSetRecord')}</p>
      )}
    </BottomSheet>
  )
}
