import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ChevronDown, CopyPlus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ExerciseNameInput } from '../exercise/ExerciseNameInput'
import { getMeasurementTypeForExercise } from '../../lib/set-record-measurement'
import type { PlanExerciseDraft } from '../../lib/plan-editor'

type PlanExerciseInlineEditorProps = {
  draft: PlanExerciseDraft
  isEditing: boolean
  isSubmitting: boolean
  onCancel: () => void
  onDraftChange: (draft: PlanExerciseDraft) => void
  onDelete?: () => void
  onImportClick?: () => void
  showActions?: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

type PresetOption = {
  label: string
  value: string
}

type PresetNumberInputProps = {
  disabled: boolean
  inputMode: 'decimal' | 'numeric'
  label: string
  min: number
  onChange: (value: string) => void
  options: PresetOption[]
  placeholder?: string
  step?: string
  value: string
}

const defaultSetValues = Array.from({ length: 12 }, (_, index) => String(index + 1))
const defaultRestSecondValues = [
  ...Array.from({ length: 19 }, (_, index) => String(index * 10)),
  '210',
  '240',
  '300',
]
const defaultWeightValues = [
  '0',
  '2.5',
  '5',
  '7.5',
  '10',
  '12.5',
  '15',
  '20',
  '25',
  '30',
  '40',
  '50',
  '60',
  '80',
  '100',
]
const defaultRepValues = [
  ...Array.from({ length: 20 }, (_, index) => String(index + 1)),
  '25',
  '30',
  '40',
  '50',
]

function withCurrentOption(values: string[], value: string) {
  if (!value || values.includes(value)) {
    return values
  }

  return [...values, value].sort((first, second) => Number(first) - Number(second))
}

function PresetNumberInput({
  disabled,
  inputMode,
  label,
  min,
  onChange,
  options,
  placeholder,
  step = '1',
  value,
}: PresetNumberInputProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node) || wrapperRef.current?.contains(event.target)) {
        return
      }

      setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [isOpen])

  return (
    <div ref={wrapperRef} className="relative block">
      <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
        {label}
      </span>
      <div className="flex rounded-xl bg-[var(--surface-container)] ring-1 ring-transparent transition-all focus-within:ring-[var(--primary)]">
        <input
          type="number"
          min={min}
          step={step}
          inputMode={inputMode}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base text-[var(--on-surface)] outline-none placeholder:text-[var(--on-surface-variant)] disabled:opacity-50"
          placeholder={placeholder}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((current) => !current)}
          className="flex w-11 shrink-0 items-center justify-center rounded-r-xl border-l border-[var(--outline-variant)] text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] disabled:opacity-50"
          aria-label={t('plans.choosePreset')}
          aria-expanded={isOpen}
        >
          <ChevronDown
            size={18}
            strokeWidth={2.25}
            aria-hidden="true"
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.375rem)] z-20 max-h-56 min-w-[9rem] overflow-y-auto rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-container-high)] p-1 shadow-[0_12px_32px_-20px_rgba(0,0,0,0.45)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {options.map((option) => {
            const selected = option.value === value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`flex h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm transition-colors ${
                  selected
                    ? 'bg-[var(--primary-container)] font-semibold text-[var(--on-primary-container)]'
                    : 'text-[var(--on-surface)] hover:bg-[var(--surface-container)]'
                }`}
              >
                <span>{option.label}</span>
                {selected ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function PlanExerciseInlineEditor({
  draft,
  isEditing,
  isSubmitting,
  onCancel,
  onDelete,
  onDraftChange,
  onImportClick,
  showActions = true,
  onSubmit,
}: PlanExerciseInlineEditorProps) {
  const { t } = useTranslation()
  const formRef = useRef<HTMLFormElement>(null)
  const measurementType = getMeasurementTypeForExercise(draft)
  const setOptions = withCurrentOption(defaultSetValues, draft.targetSets).map((value) => ({
    value,
    label: t('common.sets', { value }),
  }))
  const restOptions = withCurrentOption(defaultRestSecondValues, draft.restSeconds).map((value) => {
    const seconds = Number(value)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes === 0) {
      return { value, label: t('common.seconds', { value: remainingSeconds }) }
    }

    if (remainingSeconds === 0) {
      return { value, label: t('common.minutes', { value: minutes }) }
    }

    return {
      value,
      label: `${t('common.minutes', { value: minutes })} ${t('common.seconds', { value: remainingSeconds })}`,
    }
  })
  const weightOptions = withCurrentOption(defaultWeightValues, draft.weightKg).map((value) => ({
    value,
    label: t('common.kg', { value }),
  }))
  const repOptions = withCurrentOption(defaultRepValues, draft.reps).map((value) => ({
    value,
    label: t('common.reps', { value }),
  }))
  const valueFields = [
    measurementType === 'weightReps' || measurementType === 'weightDistance'
      ? {
          inputMode: 'decimal' as const,
          label: t('plans.defaultWeight'),
          min: 0,
          onChange: (value: string) => onDraftChange({ ...draft, weightKg: value }),
          options: weightOptions,
          placeholder: t('plans.optional'),
          step: '0.5',
          value: draft.weightKg,
        }
      : null,
    measurementType === 'weightReps' || measurementType === 'reps'
      ? {
          inputMode: 'numeric' as const,
          label: t('plans.defaultReps'),
          min: 0,
          onChange: (value: string) => onDraftChange({ ...draft, reps: value }),
          options: repOptions,
          placeholder: t('plans.optional'),
          step: '1',
          value: draft.reps,
        }
      : null,
    measurementType === 'duration'
      ? {
          inputMode: 'numeric' as const,
          label: t('plans.defaultDurationSeconds'),
          min: 0,
          onChange: (value: string) => onDraftChange({ ...draft, durationSeconds: value }),
          step: '1',
          value: draft.durationSeconds,
        }
      : null,
    measurementType === 'distance' || measurementType === 'weightDistance'
      ? {
          inputMode: 'decimal' as const,
          label: t('plans.defaultDistanceMeters'),
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
      className="relative scroll-mb-[calc(6rem+env(safe-area-inset-bottom))] rounded-[1.25rem] border border-[var(--outline-variant)]/30 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]"
    >
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={isSubmitting}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--error)] transition-colors hover:bg-[var(--error-container)] disabled:opacity-40"
          aria-label={t('common.delete')}
          title={t('common.delete')}
        >
          <Trash2 size={16} strokeWidth={2.25} aria-hidden="true" />
        </button>
      ) : null}
      <div className="space-y-4">
        <div className="block">
          <span className="mb-1 ml-1 block pr-10 text-xs font-medium text-[var(--on-surface-variant)]">
            {t('plans.exerciseName')}
          </span>
          <ExerciseNameInput
            value={draft.name}
            disabled={isSubmitting}
            onChange={(nameValue) => onDraftChange({ ...draft, ...nameValue })}
            className="w-full rounded-xl bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none ring-1 ring-transparent transition-all focus:ring-[var(--primary)]"
            placeholder={t('plans.exercisePlaceholder')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PresetNumberInput
            disabled={isSubmitting}
            inputMode="numeric"
            label={t('plans.defaultSets')}
            min={1}
            options={setOptions}
            value={draft.targetSets}
            onChange={(value) => onDraftChange({ ...draft, targetSets: value })}
          />
          <PresetNumberInput
            disabled={isSubmitting}
            inputMode="numeric"
            label={t('plans.restSeconds')}
            min={0}
            options={restOptions}
            value={draft.restSeconds}
            onChange={(value) => onDraftChange({ ...draft, restSeconds: value })}
          />
        </div>

        <div className={`grid gap-3 ${valueFields.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {valueFields.map((field) =>
            'options' in field ? (
              <PresetNumberInput
                key={field.label}
                disabled={isSubmitting}
                inputMode={field.inputMode}
                label={field.label}
                min={field.min}
                options={field.options ?? []}
                placeholder={field.placeholder}
                step={field.step}
                value={field.value}
                onChange={field.onChange}
              />
            ) : (
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
                  placeholder={t('plans.optional')}
                />
              </label>
            ),
          )}
        </div>

        {showActions ? (
          <div className="flex items-center justify-between gap-2 pt-1">
          {!isEditing && onImportClick ? (
            <button
              type="button"
              onClick={onImportClick}
              disabled={isSubmitting}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-[var(--primary)] transition-opacity disabled:opacity-40"
            >
              <CopyPlus size={17} strokeWidth={2.2} aria-hidden="true" />
              <span>{t('plans.importExercise')}</span>
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
        ) : null}
      </div>
    </form>
  )
}
