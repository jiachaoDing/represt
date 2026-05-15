import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { getDisplayExerciseName } from '../../lib/exercise-name'
import {
  formatDistanceMeters,
  formatDurationSeconds,
  getMeasurementTypeForExercise,
} from '../../lib/set-record-measurement'
import type { PlanExerciseCardProps } from './plan-exercise-list.types'

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
  const valueLabels =
    measurementType === 'weightReps'
      ? [
          exercise.weightKg ? t('common.kg', { value: exercise.weightKg }) : t('plans.weightEmpty'),
          exercise.reps ? t('common.reps', { value: exercise.reps }) : t('plans.repsEmpty'),
        ]
      : measurementType === 'reps'
      ? [exercise.reps ? t('common.reps', { value: exercise.reps }) : t('plans.repsEmpty')]
      : measurementType === 'duration'
      ? [
          exercise.durationSeconds
            ? formatDurationSeconds(exercise.durationSeconds, t)
            : t('plans.durationEmpty'),
        ]
      : measurementType === 'distance'
      ? [
          exercise.distanceMeters
            ? formatDistanceMeters(exercise.distanceMeters, t)
            : t('plans.distanceEmpty'),
        ]
      : [
          exercise.weightKg ? t('common.kg', { value: exercise.weightKg }) : t('plans.weightEmpty'),
          exercise.distanceMeters
            ? formatDistanceMeters(exercise.distanceMeters, t)
            : t('plans.distanceEmpty'),
        ]

  return (
    <div
      className={`relative overflow-hidden rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-4 py-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] transition-shadow duration-200 ${
        onCopy && !selectionMode ? 'pr-11' : ''
      } ${
        isDragging ? 'shadow-[0_10px_28px_-18px_rgba(0,0,0,0.35)]' : ''
      }`}
    >
      <div className="flex items-center gap-3">
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
          <div className="mt-2 flex flex-wrap gap-y-1 text-[13px] text-[var(--on-surface-variant)]">
            <span className="w-14 shrink-0">{t('common.sets', { value: exercise.targetSets })}</span>
            <span className="w-16 shrink-0">{t('common.seconds', { value: exercise.restSeconds })}</span>
            {valueLabels.map((label) => (
              <span key={label} className="w-20 shrink-0">{label}</span>
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
          className="absolute right-0 bottom-0 flex h-7 w-8 items-center justify-center rounded-tl-[1.1rem] rounded-br-[1.25rem] bg-[var(--surface-container)] text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-high)] disabled:opacity-40"
          aria-label={t('plans.copyExercise', { name: displayName })}
        >
          <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
