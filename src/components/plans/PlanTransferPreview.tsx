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

  return (
    <div className="space-y-3">
      {data.plans.map((plan, planIndex) => (
        <section key={`${plan.planName}-${planIndex}`} className="rounded-xl bg-[var(--surface)] px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--on-surface)]">
              {plan.planName || t('common.unnamedPlan')}
            </h3>
            <span className="shrink-0 text-xs font-medium text-[var(--primary)]">
              {t('summary.exerciseCount', { count: plan.exercises.length })}
            </span>
          </div>
          <div className="space-y-2 border-t border-[var(--outline-variant)]/35 pt-2">
            {plan.exercises.map((exercise, exerciseIndex) => {
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
      ))}

      {data.cycle.length > 0 ? (
        <section className="rounded-xl bg-[var(--surface)] px-4 py-3">
          <h3 className="mb-2 text-xs font-semibold text-[var(--on-surface-variant)]">
            {t('planShare.preview.cycleTitle')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.cycle.map((slot, index) => {
              const plan = slot === null ? null : data.plans[slot] ?? null

              return (
                <span
                  key={index}
                  className="rounded-full bg-[var(--surface-container)] px-3 py-1.5 text-xs font-medium text-[var(--on-surface)]"
                >
                  {t('planShare.preview.cycleDay', {
                    day: index + 1,
                    name: plan ? plan.planName : t('planShare.preview.restDay'),
                  })}
                </span>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
