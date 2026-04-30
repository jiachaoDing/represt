import { useEffect, useRef, type FormEvent } from 'react'
import { CopyPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ExerciseNameInput } from '../exercise/ExerciseNameInput'
import { getMeasurementTypeForExercise } from '../../lib/set-record-measurement'
import type { TemplateExerciseDraft } from '../../lib/template-editor'

type TemplateExerciseInlineEditorProps = {
  draft: TemplateExerciseDraft
  isEditing: boolean
  isSubmitting: boolean
  onCancel: () => void
  onDraftChange: (draft: TemplateExerciseDraft) => void
  onImportClick?: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function TemplateExerciseInlineEditor({
  draft,
  isEditing,
  isSubmitting,
  onCancel,
  onDraftChange,
  onImportClick,
  onSubmit,
}: TemplateExerciseInlineEditorProps) {
  const { t } = useTranslation()
  const formRef = useRef<HTMLFormElement>(null)
  const measurementType = getMeasurementTypeForExercise(draft)
  const valueFields = [
    measurementType === 'weightReps' || measurementType === 'weightDistance'
      ? {
          inputMode: 'decimal' as const,
          label: t('templates.defaultWeight'),
          min: 0,
          onChange: (value: string) => onDraftChange({ ...draft, weightKg: value }),
          step: '0.5',
          value: draft.weightKg,
        }
      : null,
    measurementType === 'weightReps' || measurementType === 'reps'
      ? {
          inputMode: 'numeric' as const,
          label: t('templates.defaultReps'),
          min: 0,
          onChange: (value: string) => onDraftChange({ ...draft, reps: value }),
          step: '1',
          value: draft.reps,
        }
      : null,
    measurementType === 'duration'
      ? {
          inputMode: 'numeric' as const,
          label: t('templates.defaultDurationSeconds'),
          min: 0,
          onChange: (value: string) => onDraftChange({ ...draft, durationSeconds: value }),
          step: '1',
          value: draft.durationSeconds,
        }
      : null,
    measurementType === 'distance' || measurementType === 'weightDistance'
      ? {
          inputMode: 'decimal' as const,
          label: t('templates.defaultDistanceMeters'),
          min: 0,
          onChange: (value: string) => onDraftChange({ ...draft, distanceMeters: value }),
          step: '1',
          value: draft.distanceMeters,
        }
      : null,
  ].filter((field): field is NonNullable<typeof field> => field !== null)

  useEffect(() => {
    const element = formRef.current
    if (!element) {
      return
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'nearest',
      })
    })
  }, [])

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="scroll-mb-[calc(6rem+env(safe-area-inset-bottom))] rounded-[1.25rem] border border-[var(--outline-variant)]/30 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]"
    >
      <div className="space-y-4">
        <div className="block">
          <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
            {t('templates.exerciseName')}
          </span>
          <ExerciseNameInput
            value={draft.name}
            disabled={isSubmitting}
            onChange={(nameValue) => onDraftChange({ ...draft, ...nameValue })}
            className="w-full rounded-xl bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none ring-1 ring-transparent transition-all focus:ring-[var(--primary)]"
            placeholder={t('templates.exercisePlaceholder')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
              className="w-full rounded-xl bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none ring-1 ring-transparent transition-all focus:ring-[var(--primary)]"
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
              className="w-full rounded-xl bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none ring-1 ring-transparent transition-all focus:ring-[var(--primary)]"
            />
          </label>
        </div>

        <div className={`grid gap-3 ${valueFields.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {valueFields.map((field) => (
            <label key={field.label} className="block">
            <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
              {field.label}
            </span>
            <input
              type="number"
              min={field.min}
              step={field.step}
              inputMode={field.inputMode}
              value={field.value}
              disabled={isSubmitting}
              onChange={(event) => field.onChange(event.target.value)}
              className="w-full rounded-xl bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none ring-1 ring-transparent transition-all focus:ring-[var(--primary)]"
              placeholder={t('templates.optional')}
            />
          </label>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {!isEditing && onImportClick ? (
            <button
              type="button"
              onClick={onImportClick}
              disabled={isSubmitting}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-[var(--primary)] transition-opacity disabled:opacity-40"
            >
              <CopyPlus size={17} strokeWidth={2.2} aria-hidden="true" />
              <span>{t('templates.importExercise')}</span>
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--surface-container)] px-4 text-sm font-medium text-[var(--on-surface)] transition-opacity disabled:opacity-40"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !draft.name.trim()}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
            >
              {isEditing ? t('common.save') : t('common.add')}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
