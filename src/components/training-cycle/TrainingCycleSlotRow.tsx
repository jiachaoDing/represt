import { useTranslation } from 'react-i18next'

import type { TrainingCycleSlotRowProps } from './training-cycle-page.types'

function TrainingCycleSlotCard({
  color,
  isSorting = false,
  isSubmitting,
  onOpenSheet,
  slot,
  template,
  weekdayLabel,
  isToday,
}: Omit<TrainingCycleSlotRowProps, 'index' | 'isDragging' | 'onCalibrateToday'>) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={() => onOpenSheet(slot.id)}
      disabled={isSubmitting || isSorting}
      className={[
        'flex flex-1 items-center justify-between rounded-3xl p-5 text-left transition-transform active:scale-[0.98] shadow-sm border border-transparent disabled:opacity-80',
        template
          ? ''
          : 'bg-[var(--surface-container)] text-[var(--on-surface)] border-[var(--outline-variant)]/20',
      ].join(' ')}
      style={
        template && color
          ? { backgroundColor: color.soft, color: color.text, borderColor: 'rgba(0,0,0,0.05)' }
          : {}
      }
    >
      <div>
        <h4 className="text-[17px] font-bold tracking-tight">
          {template ? template.name : t('trainingCycle.restDay')}
        </h4>
        <p className="mt-1 text-[13px] font-medium opacity-70">
          {template
            ? t('trainingCycle.exerciseCount', { count: template.exercises.length })
            : t('trainingCycle.restDescription')}
        </p>
        <p className="mt-2 text-[12px] font-medium opacity-60">
          {isToday ? t('trainingCycle.today') : weekdayLabel}
        </p>
      </div>

      <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 opacity-50">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
        </svg>
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
  template,
  weekdayLabel,
}: TrainingCycleSlotRowProps) {
  const { t } = useTranslation()

  return (
    <div className="relative flex gap-4 px-4 py-3">
      <div className="relative z-10 flex w-12 shrink-0 flex-col items-center pt-2">
        {isToday ? (
          <button
            type="button"
            disabled={isSubmitting || isSorting}
            onClick={() => onCalibrateToday(slot.id)}
            className="relative flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-60"
            aria-label={`${t('trainingCycle.dayNumber', { dayNumber: index + 1 })}，${t('trainingCycle.today')}`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-[var(--on-primary)] ring-4 ring-[var(--primary)]/20 shadow-sm">
              {index + 1}
            </span>
            <div className="absolute -bottom-6 whitespace-nowrap rounded-full bg-[var(--primary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--on-primary)] shadow-sm">
              {t('trainingCycle.today')}
            </div>
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting || isSorting}
            onClick={() => onCalibrateToday(slot.id)}
            className="flex h-12 w-12 items-center justify-center rounded-full transition-colors active:scale-95 disabled:opacity-60"
            aria-label={t('trainingCycle.setDayAsToday', { dayNumber: index + 1 })}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--surface-variant)] text-[11px] font-medium text-[var(--on-surface-variant)] shadow-sm">
              {index + 1}
            </span>
          </button>
        )}
      </div>

      <TrainingCycleSlotCard
        color={color}
        isSorting={isSorting}
        isSubmitting={isSubmitting || isDragging}
        isToday={isToday}
        onOpenSheet={onOpenSheet}
        slot={slot}
        template={template}
        weekdayLabel={weekdayLabel}
      />
    </div>
  )
}
