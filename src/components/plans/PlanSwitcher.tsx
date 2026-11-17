import { useLayoutEffect, useRef } from 'react'

import type { PlanWithExercises } from '../../db/plans'
import { getTemplateColor } from '../../lib/plan-color'

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
            <button
              key={plan.id}
              ref={isSelected ? selectedRef : undefined}
              data-plan-view-navigation="true"
              type="button"
              onClick={() => onSelect(plan.id)}
              disabled={isSubmitting}
              aria-pressed={isSelected}
              className={[
                'flex h-8 items-center justify-center rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors tap-highlight-transparent',
                isSelected ? 'border-2' : 'border',
                isSelected ? '' : 'hover:opacity-90',
              ].join(' ')}
              style={{
                backgroundColor: isSelected
                  ? `color-mix(in srgb, ${color.soft} 78%, transparent)`
                  : `color-mix(in srgb, ${color.soft} 36%, transparent)`,
                borderColor: isSelected
                  ? 'var(--cycle-focus)'
                  : `color-mix(in srgb, ${color.solid} 46%, transparent)`,
                color: isSelected ? color.text : color.solid,
              }}
            >
              {plan.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
