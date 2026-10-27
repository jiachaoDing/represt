import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { MeasurementType } from '../../domain/exercise-catalog'
import { getCompletedAtLabel } from '../../lib/session-display'
import { useWeightUnitPreference } from '../../lib/weight-units'
import type { SetRecord } from '../../models/types'
import { RecordingModeButton } from './RecordingModeButton'
import { LeftRightNumberInputs } from './LeftRightNumberInputs'

type ExerciseRecordInlineCardProps = {
  isSubmitting: boolean
  latestSetRecord: SetRecord | null
  distanceInput: string
  durationInput: string
  measurementType: MeasurementType
  onRecordingModeChange: (value: MeasurementType) => void
  rightWeightInput: string
  rightRepsInput: string
  onRightWeightChange: (value: string) => void
  onRightRepsChange: (value: string) => void
  repsInput: string
  weightInput: string
  onCancel: () => void
  onDistanceChange: (value: string) => void
  onDurationChange: (value: string) => void
  onRepsChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onWeightChange: (value: string) => void
}

export function ExerciseRecordInlineCard({
  isSubmitting,
  latestSetRecord,
  distanceInput,
  durationInput,
  measurementType,
  onRecordingModeChange,
  rightWeightInput,
  rightRepsInput,
  onRightWeightChange,
  onRightRepsChange,
  repsInput,
  weightInput,
  onCancel,
  onDistanceChange,
  onDurationChange,
  onRepsChange,
  onSubmit,
  onWeightChange,
}: ExerciseRecordInlineCardProps) {
  const { i18n, t } = useTranslation()
  const { unit: weightUnit } = useWeightUnitPreference()
  const weightUnitLabel = t(`common.weight.${weightUnit}`, { value: '' }).trim()
  const fields = [
    measurementType === 'weightReps' || measurementType === 'weightDistance' || measurementType === 'leftRightWeightReps'
      ? {
          inputMode: 'decimal' as const,
          label: `${t('exercise.weightKg')} (${weightUnitLabel})`,
          min: 0,
          onChange: onWeightChange,
          step: weightUnit === 'lb' ? '1' : '0.5',
          value: weightInput,
          rightValue: measurementType === 'leftRightWeightReps' ? rightWeightInput : undefined,
          onRightChange: onRightWeightChange,
        }
      : null,
    measurementType === 'weightReps' || measurementType === 'reps' || measurementType === 'leftRightWeightReps' || measurementType === 'durationReps'
      ? {
          inputMode: 'numeric' as const,
          label: t('exercise.reps'),
          min: 0,
          onChange: onRepsChange,
          step: '1',
          value: repsInput,
          rightValue: measurementType === 'leftRightWeightReps' ? rightRepsInput : undefined,
          onRightChange: onRightRepsChange,
        }
      : null,
    measurementType === 'duration' || measurementType === 'durationReps'
      ? {
          inputMode: 'numeric' as const,
          label: t('exercise.durationSeconds'),
          min: 0,
          onChange: onDurationChange,
          step: '1',
          value: durationInput,
        }
      : null,
    measurementType === 'distance' || measurementType === 'weightDistance'
      ? {
          inputMode: 'decimal' as const,
          label: t('exercise.distanceMeters'),
          min: 0,
          onChange: onDistanceChange,
          step: '1',
          value: distanceInput,
        }
      : null,
  ].filter((field): field is NonNullable<typeof field> => field !== null)
  if (measurementType === 'durationReps') fields.reverse()

  return (
    <section className="mx-auto max-h-[calc(100dvh_-_5rem)] w-full max-w-[22rem] overflow-y-auto rounded-[28px] bg-[var(--surface-container)] p-5 shadow-2xl">
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
            <div className="border-b border-[var(--outline-variant)]/45 pb-3">
              <p className="text-xs font-medium text-[var(--on-surface-variant)]">{t('exercise.setIndex')}</p>
              <p className="mt-1 text-sm font-medium text-[var(--on-surface)]">
                {t('summary.setNumber', { setNumber: latestSetRecord.setNumber })}
              </p>
            </div>
            <div className="border-b border-[var(--outline-variant)]/45 pb-3">
              <p className="text-xs font-medium text-[var(--on-surface-variant)]">{t('exercise.completedAt')}</p>
              <p className="mt-1 text-sm font-medium text-[var(--on-surface)]">
                {getCompletedAtLabel(latestSetRecord.completedAt, i18n.resolvedLanguage)}
              </p>
            </div>
          </div>

          <div className={`relative grid gap-4 ${fields.length === 1 ? 'mx-auto w-[calc(50%_-_0.5rem)] grid-cols-1' : 'grid-cols-2'}`}>
            <RecordingModeButton
              value={measurementType}
              disabled={isSubmitting}
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 -translate-y-1/2"
              onChange={onRecordingModeChange}
            />
            {fields.map((field) => 'rightValue' in field && field.rightValue !== undefined ? (
              <LeftRightNumberInputs
                key={field.label} label={field.label} left={field.value} right={field.rightValue}
                onLeftChange={field.onChange} onRightChange={field.onRightChange}
                disabled={isSubmitting} inputMode={field.inputMode} step={field.step} variant="record"
              />
            ) : (
              <label key={field.label} className="block">
              <span className={`mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)] ${fields.length === 1 ? 'text-center' : ''}`}>
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
                className={`w-full rounded-none border-b border-[var(--on-surface)] bg-transparent px-1 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)] disabled:opacity-50 ${fields.length === 1 ? 'text-center' : ''}`}
              />
            </label>
            ))}
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
