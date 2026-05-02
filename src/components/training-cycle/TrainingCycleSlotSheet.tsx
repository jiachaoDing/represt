import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { BottomSheet } from '../ui/BottomSheet'
import type { PlanWithExercises } from '../../db/plans'
import { getPlanColor, type PlanColor } from '../../lib/plan-color'
import { DeleteIcon, OptionIcon, RestIcon, PlanIcon } from './TrainingCycleOptionIcon'

type TrainingCycleSlotSheetProps = {
  isSubmitting: boolean
  onAssignPlan: (planId: string | null) => void
  onClose: () => void
  onDeleteSlot: (slotId: string | null) => void
  open: boolean
  selectedIndex: number
  selectedSlotId: string | null
  selectedPlan: PlanWithExercises | null
  planColorMap: Map<string, PlanColor>
  plans: PlanWithExercises[]
}

export function TrainingCycleSlotSheet({
  isSubmitting,
  onAssignPlan,
  onClose,
  onDeleteSlot,
  open,
  selectedIndex,
  selectedSlotId,
  selectedPlan,
  planColorMap,
  plans,
}: TrainingCycleSlotSheetProps) {
  const { t } = useTranslation()

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t('trainingCycle.dayNumber', { dayNumber: selectedIndex + 1 })}
      description={
        selectedPlan
          ? t('trainingCycle.currentSelection', { name: selectedPlan.name })
          : t('trainingCycle.currentRestDay')
      }
    >
      <div className="grid gap-1">
        <button
          type="button"
          onClick={() => {
            onAssignPlan(null)
            onClose()
          }}
          disabled={isSubmitting}
          className={[
            'flex items-center justify-between rounded-[1rem] px-4 py-3 text-left transition-colors active:scale-[0.98]',
            selectedPlan === null
              ? 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)]'
              : 'bg-transparent text-[var(--on-surface)]',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            <OptionIcon className="bg-[var(--surface-container)] text-[var(--on-surface-variant)]">
              <RestIcon />
            </OptionIcon>
            <span className="font-semibold">{t('trainingCycle.restDay')}</span>
          </div>
          {selectedPlan === null && (
            <svg className="h-5 w-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {plans.map((plan) => {
          const color = planColorMap.get(plan.id) ?? getPlanColor(0)
          const isActive = selectedPlan?.id === plan.id

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => {
                onAssignPlan(plan.id)
                onClose()
              }}
              disabled={isSubmitting}
              className={[
                'flex items-center justify-between rounded-[1rem] px-4 py-3 text-left transition-colors active:scale-[0.98]',
                isActive
                  ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                  : 'bg-transparent text-[var(--on-surface)]',
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                <OptionIcon
                  className="shadow-sm"
                  style={{ backgroundColor: color.soft, color: color.solid }}
                >
                  <PlanIcon />
                </OptionIcon>
                <div>
                  <div className="font-semibold">{plan.name}</div>
                  <div className="text-[13px] font-medium opacity-70 mt-0.5">
                    {t('trainingCycle.exerciseCount', { count: plan.exercises.length })}
                  </div>
                </div>
              </div>
              {isActive && (
                <svg className="h-5 w-5" style={{ color: color.solid }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )
        })}

        <div className="my-3 h-px bg-[var(--outline-variant)]/20" />

        <Link
          to="/plans"
          state={{ openPlanCreateSheet: true }}
          viewTransition
          onClick={onClose}
          className="flex items-center gap-3 rounded-[1rem] px-4 py-3.5 text-left text-[var(--primary)] hover:bg-[var(--primary-container)] transition-colors active:scale-[0.98]"
        >
          <OptionIcon className="bg-[var(--primary-container)] text-[var(--primary)]">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </OptionIcon>
          <span className="font-medium">{t('plans.newPlan')}</span>
        </Link>

        <button
          type="button"
          onClick={() => {
            onDeleteSlot(selectedSlotId)
            onClose()
          }}
          disabled={isSubmitting}
          className="flex items-center gap-3 rounded-[1rem] px-4 py-3.5 text-left text-[var(--error)] hover:bg-[var(--error-container)] transition-colors active:scale-[0.98]"
        >
          <OptionIcon className="bg-[var(--error-container)] text-[var(--error)]">
            <DeleteIcon />
          </OptionIcon>
          <span className="font-medium">{t('trainingCycle.deleteDay')}</span>
        </button>
      </div>
    </BottomSheet>
  )
}
