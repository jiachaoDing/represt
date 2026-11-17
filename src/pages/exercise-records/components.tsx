import { useTranslation } from 'react-i18next'
import { getMuscleGroupName } from '../../lib/exercise-catalog-i18n'
import type { ExerciseRecordDetail } from '../../db/sessions'

export function MuscleDistributionCard({ detail }: { detail: ExerciseRecordDetail }) {
  const { t } = useTranslation()
  const distribution = detail.muscleDistribution

  return (
    <section className="mx-4 mt-3 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <h2 className="text-[16px] font-bold text-[var(--on-surface)]">{t('summary.exerciseRecords.muscleDistribution')}</h2>
      {distribution.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--on-surface-variant)]">{t('summary.exerciseRecords.noDistribution')}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {distribution.map((item, index) => {
            const percentage = Math.round(item.ratio * 100)
            return (
              <div key={item.muscleGroupId} className="grid grid-cols-[4rem_1fr_2.75rem] items-center gap-3">
                <span className="truncate text-[13px] font-medium text-[var(--on-surface)]">{getMuscleGroupName(t, item.muscleGroupId)}</span>
                <div className="h-2.5 rounded-full bg-[var(--surface-container)]">
                  <div
                    className="h-2.5 rounded-full"
                    style={{ width: `${percentage}%`, backgroundColor: `var(--plan-${index < 3 ? index + 1 : 5})` }}
                  />
                </div>
                <span className="text-right text-[12px] font-semibold text-[var(--on-surface-variant)]">{percentage}%</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
