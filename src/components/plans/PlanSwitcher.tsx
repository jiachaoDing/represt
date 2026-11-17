import { useLayoutEffect, useRef } from 'react'

import type { PlanWithExercises } from '../../db/plans'
import { getTemplateColor } from '../../lib/plan-color'
import { PlanTemplateChip } from './PlanTemplateChip'

type PlanSwitcherProps = {
  isSubmitting: boolean
  selectedPlanId: string | null
  plans: PlanWithExercises[]
  onSelect: (planId: string) => void
}

export function PlanSwitcher({
  isSubmitting,
  selectedPlanId,
  plans,
  onSelect,
}: PlanSwitcherProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    const container = scrollRef.current
    const selected = selectedRef.current
    if (!container || !selected) return

    const containerRect = container.getBoundingClientRect()
    const selectedRect = selected.getBoundingClientRect()
    if (selectedRect.left < containerRect.left + 16 || selectedRect.right > containerRect.right - 16) {
      container.scrollLeft += selectedRect.left - containerRect.left - 16
    }
  }, [selectedPlanId, plans.length])

  return (
    <div
      ref={scrollRef}
      className="-mx-4 mt-2 overflow-x-auto px-4 scrollbar-hide"
      data-primary-tab-swipe-lock="true"
    >
      <div className="flex w-max items-center gap-2 pb-2">
        {plans.map((plan) => {
          const isSelected = plan.id === selectedPlanId
          const color = getTemplateColor(plan)
          return (
            <PlanTemplateChip
              key={plan.id}
              ref={isSelected ? selectedRef : undefined}
              data-plan-view-navigation="true"
              onClick={() => onSelect(plan.id)}
              disabled={isSubmitting}
              selected={isSelected}
              color={color}
            >
              {plan.name}
            </PlanTemplateChip>
          )
        })}
      </div>
    </div>
  )
}
