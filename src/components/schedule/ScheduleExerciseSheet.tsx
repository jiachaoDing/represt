import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { ExerciseNameInput } from '../exercise/ExerciseNameInput'
import { BottomSheet } from '../ui/BottomSheet'

type ScheduleExerciseDraft = {
  name: string
  targetSets: string
  restSeconds: string
  weightKg: string
  reps: string
}

type ScheduleExerciseSheetProps = {
  draft: ScheduleExerciseDraft
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onDraftChange: (draft: ScheduleExerciseDraft) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function ScheduleExerciseSheet({
  draft,
  isOpen,
  isSubmitting,
  onClose,
  onDraftChange,
  onSubmit,
}: ScheduleExerciseSheetProps) {
  const { t } = useTranslation()

  return (
    <BottomSheet open={isOpen} title={t('schedule.manualNewExercise')} onClose={onClose}>
      <form className="mt-2 space-y-5" onSubmit={onSubmit}>
        <div className="block">
          <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
            {t('templates.exerciseName')}
          </span>
          <ExerciseNameInput
            value={draft.name}
            disabled={isSubmitting}
            onChange={(name) => onDraftChange({ ...draft, name })}
            className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
            placeholder={t('templates.exercisePlaceholder')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
              {t('templates.defaultSets')}
            </span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={draft.targetSets}
              disabled={isSubmitting}
              onChange={(event) => onDraftChange({ ...draft, targetSets: event.target.value })}
              className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
            />
          </label>

          <label className="block">
            <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
              {t('templates.restSeconds')}
            </span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.restSeconds}
              disabled={isSubmitting}
              onChange={(event) => onDraftChange({ ...draft, restSeconds: event.target.value })}
              className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
              {t('templates.defaultWeight')}
            </span>
            <input
              type="number"
              min={0}
              step="0.5"
              inputMode="decimal"
              value={draft.weightKg}
              disabled={isSubmitting}
              onChange={(event) => onDraftChange({ ...draft, weightKg: event.target.value })}
              className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
              placeholder={t('templates.optional')}
            />
          </label>

          <label className="block">
            <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
              {t('templates.defaultReps')}
            </span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.reps}
              disabled={isSubmitting}
              onChange={(event) => onDraftChange({ ...draft, reps: event.target.value })}
              className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
              placeholder={t('templates.optional')}
            />
          </label>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !draft.name.trim()}
            className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
          >
            {t('schedule.addToToday')}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
