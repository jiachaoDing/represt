import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import type { TrainingCycleSlotRowProps } from './training-cycle-page.types'
import { CycleNode } from './CycleNode'

function TrainingCycleSlotCard({
  color,
  isSorting = false,
  isSubmitting,
  onOpenSheet,
  slot,
  plan,
  weekdayLabel,
}: Omit<TrainingCycleSlotRowProps, 'index' | 'isDragging' | 'isToday' | 'onCalibrateToday'>) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={() => onOpenSheet(slot.id)}
      disabled={isSubmitting || isSorting}
      className={[
        'relative flex h-[88px] min-w-0 flex-1 origin-left items-center justify-between gap-2 rounded-[1.4rem] px-4 text-left active:scale-[0.98] border border-transparent shadow-[var(--shadow-soft)] disabled:opacity-80',
        plan
          ? ''
          : 'bg-[var(--surface-container)] text-[var(--on-surface)] border-[var(--outline-variant)]/20',
      ].join(' ')}
      style={{
        transform: 'scale(var(--cycle-card-scale, 1))',
        backgroundColor: plan && color ? color.soft : undefined,
        color: plan && color ? color.text : undefined,
      }}
    >
      <span aria-hidden="true" className="absolute -left-px top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--cycle-accent)]" />
      <div className="min-w-0">
        <h4 className="line-clamp-2 break-words text-[16px] font-bold leading-snug tracking-tight">
          {plan ? plan.name : t('trainingCycle.restDay')}
        </h4>
        <p className="mt-1 truncate text-[12px] font-medium opacity-75">
          {plan
            ? t('trainingCycle.exerciseCount', { count: plan.exercises.length })
            : t('trainingCycle.restDescription')}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-[12px] font-medium opacity-70">
          {weekdayLabel}
        </span>
        <div className="flex h-5 w-5 items-center justify-center opacity-50" aria-hidden="true">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  )
}

export function TrainingCycleSlotRow({
  color,
  index,
  isDragging = false,
  isSorting = false,
  isSubmitting,
  isToday,
  onCalibrateToday,
  onOpenSheet,
  slot,
  plan,
  weekdayLabel,
}: TrainingCycleSlotRowProps) {
  const { t } = useTranslation()

  return (
    <div style={{ '--cycle-accent': color?.solid ?? 'var(--cycle-rest)' } as CSSProperties} className="relative flex h-[112px] items-center px-4 pr-6">
      <span aria-hidden="true" className="pointer-events-none absolute left-10 top-1/2 h-px w-9 bg-[var(--cycle-accent)]/35" />
      <div className="relative z-10 flex w-12 shrink-0 items-center justify-center">
        {isToday ? (
          <button
            type="button"
            disabled={isSubmitting || isSorting}
            aria-current="date"
            onClick={() => onCalibrateToday(slot.id)}
            className="relative flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-60"
            aria-label={`${t('trainingCycle.dayNumber', { dayNumber: index + 1 })}，${t('trainingCycle.today')}`}
          >
            <span style={{ transform: 'scale(var(--cycle-node-scale, 1))' }}>
              <CycleNode color={color} focused={false} day={index + 1} />
            </span>
            <span className="absolute top-full mt-0.5 whitespace-nowrap text-[10px] font-medium leading-4 text-[var(--on-surface-variant)]">
              {t('trainingCycle.today')}
            </span>
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting || isSorting}
            onClick={() => onCalibrateToday(slot.id)}
            className="flex h-12 w-12 items-center justify-center rounded-full transition-colors active:scale-95 disabled:opacity-60"
            aria-label={t('trainingCycle.setDayAsToday', { dayNumber: index + 1 })}
          >
            <span style={{ transform: 'scale(var(--cycle-node-scale, 1))' }}>
              <CycleNode color={color} focused={false} day={index + 1} />
            </span>
          </button>
        )}
      </div>
      <span aria-hidden="true" className="w-3 shrink-0" />

      <TrainingCycleSlotCard
        color={color}
        isSorting={isSorting}
        isSubmitting={isSubmitting || isDragging}
        onOpenSheet={onOpenSheet}
        slot={slot}
        plan={plan}
        weekdayLabel={weekdayLabel}
      />
    </div>
  )
}
