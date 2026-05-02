import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { BottomSheet } from '../ui/BottomSheet'
import type { PlanWithExercises } from '../../db/plans'
import { getDisplayExerciseName } from '../../lib/exercise-name'

type PlanExerciseImportSheetProps = {
  isOpen: boolean
  isSubmitting: boolean
  selectedExerciseIds: string[]
  sourcePlans: PlanWithExercises[]
  onClose: () => void
  onSubmit: () => void
  onToggleExercise: (exerciseId: string) => void
}

export function PlanExerciseImportSheet({
  isOpen,
  isSubmitting,
  selectedExerciseIds,
  sourcePlans,
  onClose,
  onSubmit,
  onToggleExercise,
}: PlanExerciseImportSheetProps) {
  const { t } = useTranslation()
  const totalExerciseCount = sourcePlans.reduce(
    (count, plan) => count + plan.exercises.length,
    0,
  )

  return (
    <BottomSheet open={isOpen} title={t('plans.importFromPlans')} onClose={onClose}>
      <div className="space-y-4">
        <p className="px-1 text-sm text-[var(--on-surface-variant)]">
          {t('plans.importSelection', {
            selected: selectedExerciseIds.length,
            total: totalExerciseCount,
          })}
        </p>

        <div className="-mx-2 max-h-[52vh] space-y-4 overflow-y-auto px-2">
          {sourcePlans.map((plan) => (
            <section key={plan.id}>
              <h3 className="px-2 pb-1 text-xs font-semibold text-[var(--on-surface-variant)]">
                {plan.name}
              </h3>
              <div className="space-y-1">
                {plan.exercises.map((exercise) => {
                  const displayName = getDisplayExerciseName(t, exercise)

                  return (
                  <label
                    key={exercise.id}
                    className="flex cursor-pointer items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-[var(--surface-container)]"
                  >
                    <span className="relative flex h-5 w-5 items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedExerciseIds.includes(exercise.id)}
                        disabled={isSubmitting}
                        onChange={() => onToggleExercise(exercise.id)}
                        className="peer h-5 w-5 shrink-0 appearance-none rounded-sm border-2 border-[var(--outline)] transition-all checked:border-[var(--primary)] checked:bg-[var(--primary)]"
                      />
                      <Check
                        size={16}
                        strokeWidth={3}
                        className="pointer-events-none absolute text-[var(--on-primary)] opacity-0 transition-opacity peer-checked:opacity-100"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base text-[var(--on-surface)]">
                        {displayName}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--on-surface-variant)]">
                        {t('plans.exerciseMeta', {
                          sets: exercise.targetSets,
                          seconds: exercise.restSeconds,
                        })}
                      </span>
                    </span>
                  </label>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {selectedExerciseIds.length === 0 ? (
          <p className="text-sm text-[var(--error)]">{t('plans.atLeastOneExercise')}</p>
        ) : null}

        <div className="pt-2">
          <button
            type="button"
            disabled={isSubmitting || selectedExerciseIds.length === 0}
            onClick={onSubmit}
            className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
          >
            {t('plans.importSelected')}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
