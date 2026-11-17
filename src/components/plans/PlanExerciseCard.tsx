import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { getDisplayExerciseName } from '../../lib/exercise-name'
import {
  formatDistanceMeters,
  formatDurationSeconds,
  buildSetRecordValuesForMeasurement,
  formatRepsValues,
  formatWeightValues,
  getMeasurementTypeForExercise,
} from '../../lib/set-record-measurement'
import type { PlanExerciseCardProps } from './plan-exercise-list.types'

function validParameter(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

export function PlanExerciseCard({
  exercise,
  index,
  isDragging = false,
  isSelected = false,
  isSubmitting,
  onCopy,
  selectionMode = false,
}: PlanExerciseCardProps) {
  const { t } = useTranslation()
  const displayName = getDisplayExerciseName(t, exercise)
  const measurementType = getMeasurementTypeForExercise(exercise)
  const values = buildSetRecordValuesForMeasurement(measurementType, {
    weightKg: validParameter(exercise.weightKg),
    reps: validParameter(exercise.reps),
    rightWeightKg: validParameter(exercise.rightWeightKg),
    rightReps: validParameter(exercise.rightReps),
    durationSeconds: validParameter(exercise.durationSeconds),
    distanceMeters: validParameter(exercise.distanceMeters),
  })
  const rightWeight = 'rightWeightKg' in values ? values.rightWeightKg : null
  const rightReps = 'rightReps' in values ? values.rightReps : null
  const valueLabels = [
    validParameter(exercise.targetSets) !== null ? t('common.sets', { value: exercise.targetSets }) : null,
    values.reps != null || rightReps != null ? formatRepsValues(values.reps, rightReps, t) : null,
    validParameter(exercise.restSeconds) !== null ? t('common.seconds', { value: exercise.restSeconds }) : null,
    values.weightKg != null || rightWeight != null ? formatWeightValues(values.weightKg, rightWeight, t) : null,
    values.durationSeconds != null ? formatDurationSeconds(values.durationSeconds, t) : null,
    values.distanceMeters != null ? formatDistanceMeters(values.distanceMeters, t) : null,
  ].filter((label) => label !== null)

  return (
    <div
      className={`relative overflow-hidden rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-3 py-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] transition-shadow duration-200 ${
        onCopy && !selectionMode ? 'pr-11' : ''
      } ${
        isDragging ? 'shadow-[0_10px_28px_-18px_rgba(0,0,0,0.35)]' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[15px] font-bold transition-colors ${
            selectionMode
              ? isSelected
                ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                : 'border border-[var(--outline)] text-transparent'
              : 'text-[var(--on-surface)]'
          } ${isSubmitting ? 'opacity-40' : ''}`}
          aria-hidden="true"
        >
          {selectionMode && isSelected ? (
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            index + 1
          )}
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="truncate text-[15px] font-semibold text-[var(--on-surface)]">
            {displayName}
          </div>
          <div data-primary-tab-swipe-lock="true" className="mt-1.5 flex flex-nowrap gap-2.5 overflow-x-auto whitespace-nowrap text-xs tabular-nums text-[var(--on-surface-variant)] scrollbar-hide">
            {valueLabels.map((label, valueIndex) => (
              <span key={valueIndex} className="shrink-0">{label}</span>
            ))}
          </div>
        </div>

      </div>
      {onCopy && !selectionMode ? (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onCopy(exercise.id)
          }}
          disabled={isSubmitting}
          className="group absolute right-0 bottom-0 flex h-11 w-11 items-end justify-end text-[var(--on-surface)] disabled:opacity-40"
          aria-label={t('plans.copyExercise', { name: displayName })}
        >
          <span className="flex h-7 w-8 items-center justify-center rounded-tl-[1.1rem] rounded-br-[1.25rem] bg-[var(--surface-container)] transition-colors group-hover:bg-[var(--surface-container-high)]">
            <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
          </span>
        </button>
      ) : null}
    </div>
  )
}
