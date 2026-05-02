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
  onEdit,
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
      className={`rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-4 py-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] transition-shadow duration-200 ${
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

        {onEdit && !selectionMode ? (
          <button
            type="button"
            onClick={() => onEdit(exercise.id)}
            disabled={isSubmitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container)] disabled:opacity-40"
            aria-label={t('plans.editExercise', { name: displayName })}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  )
}
