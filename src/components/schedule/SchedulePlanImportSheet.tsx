import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { BottomSheet } from '../ui/BottomSheet'
import type { PlanWithExercises } from '../../db/plans'
import { getDisplayExerciseName } from '../../lib/exercise-name'

type SchedulePlanImportSheetProps = {
  isOpen: boolean
  isSubmitting: boolean
  selectedExerciseIds: string[]
  sourcePlans?: PlanWithExercises[]
  plan: PlanWithExercises | null
  onClose: () => void
  onCreateExercise?: () => void
  onSubmit: () => void
  onToggleExercise: (exerciseId: string) => void
}

export function SchedulePlanImportSheet({
  isOpen,
  isSubmitting,
  selectedExerciseIds,
  sourcePlans = [],
  plan,
  onClose,
  onCreateExercise,
  onSubmit,
  onToggleExercise,
}: SchedulePlanImportSheetProps) {
  const { t } = useTranslation()
  const plans = plan ? [plan] : sourcePlans.filter((item) => item.exercises.length > 0)
  const totalExerciseCount = plans.reduce((count, item) => count + item.exercises.length, 0)
  const title = plan?.name ?? t('plans.importFromPlans')

  return (
    <BottomSheet open={isOpen && plans.length > 0} title={title} onClose={onClose}>
      {plans.length > 0 ? (
        <div className="space-y-4">
          {onCreateExercise ? (
            <button
              type="button"
              onClick={onCreateExercise}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--surface-container)]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-container)] text-[var(--primary)]">
                <Plus size={18} strokeWidth={2.25} />
              </span>
              <span className="text-base font-medium text-[var(--on-surface)]">
                {t('schedule.manualNewExercise')}
              </span>
            </button>
          ) : null}

          <p className="px-1 text-sm text-[var(--on-surface-variant)]">
            {t('schedule.importSelection', { selected: selectedExerciseIds.length, total: totalExerciseCount })}
          </p>

          <div className="-mx-2 max-h-[50vh] space-y-4 overflow-y-auto px-2">
            {plans.map((sourcePlan) => (
              <section key={sourcePlan.id}>
                {plan ? null : (
                  <h3 className="px-2 pb-1 text-xs font-semibold text-[var(--on-surface-variant)]">
                    {sourcePlan.name}
                  </h3>
                )}
                <div className="space-y-1">
                  {sourcePlan.exercises.map((exercise) => {
                    const displayName = getDisplayExerciseName(t, exercise)

                    return (
                    <label
                      key={exercise.id}
                      className="flex cursor-pointer items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-[var(--surface-container)]"
                    >
                      <div className="relative flex h-5 w-5 items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedExerciseIds.includes(exercise.id)}
                          disabled={isSubmitting}
                          onChange={() => onToggleExercise(exercise.id)}
                          className="peer h-5 w-5 shrink-0 appearance-none rounded-sm border-2 border-[var(--outline)] transition-all checked:border-[var(--primary)] checked:bg-[var(--primary)]"
                        />
                        <svg
                          viewBox="0 0 24 24"
                          className="pointer-events-none absolute h-4 w-4 text-[var(--on-primary)] opacity-0 transition-opacity peer-checked:opacity-100"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base text-[var(--on-surface)]">{displayName}</p>
                        <p className="mt-0.5 text-xs text-[var(--on-surface-variant)]">
                          {t('schedule.restMeta', { sets: exercise.targetSets, seconds: exercise.restSeconds })}
                        </p>
                      </div>
                    </label>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          {selectedExerciseIds.length === 0 ? (
            <p className="text-sm text-[var(--error)]">{t('schedule.atLeastOneExercise')}</p>
          ) : null}

          <div className="pt-2">
            <button
              type="button"
              disabled={isSubmitting || selectedExerciseIds.length === 0}
              onClick={onSubmit}
              className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
            >
              {t('schedule.joinToday')}
            </button>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  )
}
