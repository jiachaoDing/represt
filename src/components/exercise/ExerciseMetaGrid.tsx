import { useTranslation } from 'react-i18next'
import { Clock, Dumbbell } from 'lucide-react'

type ExerciseMetaGridProps = {
  name: string
  restSeconds: number
}

export function ExerciseMetaGrid({ name, restSeconds }: ExerciseMetaGridProps) {
  const { t } = useTranslation()

  return (
    <section className="border-t border-[var(--outline-variant)]/45 py-6">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-container)] text-[var(--on-surface)]">
            <Dumbbell size={20} strokeWidth={2.1} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] text-[var(--on-surface-variant)]">{t('exercise.exerciseNameLabel')}</p>
            <p className="mt-0.5 truncate text-[16px] font-medium text-[var(--on-surface)]">{name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-container)] text-[var(--on-surface)]">
            <Clock size={20} strokeWidth={2.1} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] text-[var(--on-surface-variant)]">{t('exercise.restSecondsLabel')}</p>
            <p className="mt-0.5 truncate text-[16px] font-medium text-[var(--on-surface)]">
              {t('exercise.restSecondsValue', { seconds: restSeconds })}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
