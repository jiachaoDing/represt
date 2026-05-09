import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PlanTransferData, PlanTransferExercise } from '../../lib/plan-transfer'
import { formatNumber } from '../../lib/set-record-measurement'

type PlanTransferPreviewProps = {
  data: PlanTransferData
}

function getExerciseValueParts(
  t: ReturnType<typeof useTranslation>['t'],
  exercise: PlanTransferExercise,
) {
  return [
    exercise.weightKg === null ? null : t('common.kg', { value: formatNumber(exercise.weightKg) }),
    exercise.reps === null ? null : t('common.reps', { value: exercise.reps }),
    exercise.durationSeconds === null ? null : t('common.seconds', { value: exercise.durationSeconds }),
    exercise.distanceMeters === null ? null : t('common.meters', { value: formatNumber(exercise.distanceMeters) }),
  ].filter((part): part is string => part !== null)
}

export function PlanTransferPreview({ data }: PlanTransferPreviewProps) {
  const { t } = useTranslation()
  const initialSelection = useMemo(() => {
    const cycleSlotIndex = data.cycle.findIndex((slot) => slot !== null)
    if (cycleSlotIndex >= 0) {
      return {
        cycleSlotIndex,
        planIndex: data.cycle[cycleSlotIndex],
      }
    }

    return {
      cycleSlotIndex: null,
      planIndex: data.plans.length > 0 ? 0 : null,
    }
  }, [data])
  const [selectedCycleSlotIndex, setSelectedCycleSlotIndex] = useState<number | null>(initialSelection.cycleSlotIndex)
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number | null>(initialSelection.planIndex)
  const selectedPlan = selectedPlanIndex === null ? null : data.plans[selectedPlanIndex] ?? null

  useEffect(() => {
    setSelectedCycleSlotIndex(initialSelection.cycleSlotIndex)
    setSelectedPlanIndex(initialSelection.planIndex)
  }, [initialSelection])

  return (
    <div className="space-y-3">
      {data.cycle.length > 0 ? (
        <section className="rounded-xl bg-[var(--surface)] px-4 py-3">
          <h3 className="mb-2 text-xs font-semibold text-[var(--on-surface-variant)]">
            {t('planShare.preview.cycleTitle')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.cycle.map((slot, index) => {
              const plan = slot === null ? null : data.plans[slot] ?? null
              const isSelected = selectedCycleSlotIndex === index

              return (
                <button
                  key={index}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedCycleSlotIndex(index)
                    setSelectedPlanIndex(slot)
                  }}
                  className={[
                    'rounded-full px-3 py-1.5 text-left text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                      : 'bg-[var(--surface-container)] text-[var(--on-surface)]',
                  ].join(' ')}
                >
                  {t('planShare.preview.cycleDay', {
                    day: index + 1,
                    name: plan ? plan.planName : t('planShare.preview.restDay'),
                  })}
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {data.cycle.length === 0 && data.plans.length > 1 ? (
        <section className="rounded-xl bg-[var(--surface)] px-4 py-3">
          <h3 className="mb-2 text-xs font-semibold text-[var(--on-surface-variant)]">
            {t('planShare.preview.planTitle')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.plans.map((plan, planIndex) => {
              const isSelected = selectedPlanIndex === planIndex

              return (
                <button
                  key={`${plan.planName}-${planIndex}`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedCycleSlotIndex(null)
                    setSelectedPlanIndex(planIndex)
                  }}
                  className={[
                    'max-w-full rounded-full px-3 py-1.5 text-left text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                      : 'bg-[var(--surface-container)] text-[var(--on-surface)]',
                  ].join(' ')}
                >
                  <span className="block max-w-40 truncate">{plan.planName || t('common.unnamedPlan')}</span>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {selectedPlan ? (
        <section className="rounded-xl bg-[var(--surface)] px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--on-surface)]">
              {selectedPlan.planName || t('common.unnamedPlan')}
            </h3>
            <span className="shrink-0 text-xs font-medium text-[var(--primary)]">
              {t('summary.exerciseCount', { count: selectedPlan.exercises.length })}
            </span>
          </div>
          <div className="space-y-2 border-t border-[var(--outline-variant)]/35 pt-2">
            {selectedPlan.exercises.map((exercise, exerciseIndex) => {
              const valueParts = getExerciseValueParts(t, exercise)

              return (
                <div key={`${exercise.name}-${exerciseIndex}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--on-surface)]">
                      {exercise.name || t('common.unnamedExercise')}
                    </p>
                    <span className="shrink-0 text-xs font-medium text-[var(--primary)]">
                      {t('plans.exerciseMeta', {
                        sets: exercise.targetSets,
                        seconds: exercise.restSeconds,
                      })}
                    </span>
                  </div>
                  {valueParts.length > 0 ? (
                    <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">
                      {valueParts.join(' · ')}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
