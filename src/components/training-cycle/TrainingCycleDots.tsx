import type { TrainingCycleSlot } from '../../models/types'
import type { PlanColor } from '../../lib/plan-color'

type TrainingCycleDotsProps = {
  currentIndex?: number | null
  getPlanColor: (planId: string) => PlanColor | null
  highlightedPlanId?: string | null
  slots: TrainingCycleSlot[]
}

export function TrainingCycleDots({
  currentIndex = null,
  getPlanColor,
  highlightedPlanId = null,
  slots,
}: TrainingCycleDotsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {slots.map((slot, index) => {
        const color = slot.planId ? getPlanColor(slot.planId) : null
        const isCurrent = currentIndex === index
        const isHighlighted = highlightedPlanId
          ? slot.planId === highlightedPlanId
          : slot.planId !== null

        return (
          <div key={slot.id} className="relative flex flex-col items-center">
            <span
              className={[
                'block h-3.5 w-3.5 rounded-full border transition-transform',
                isCurrent ? 'scale-110 ring-2 ring-[var(--on-surface)]/15 ring-offset-2 ring-offset-[var(--surface)]' : '',
              ].join(' ')}
              style={
                isHighlighted && color
                  ? {
                      backgroundColor: color.solid,
                      borderColor: color.solid,
                    }
                  : slot.planId && color
                    ? {
                        backgroundColor: color.soft,
                        borderColor: color.soft,
                      }
                    : {
                        backgroundColor: 'var(--surface-container)',
                        borderColor: 'var(--outline-variant)',
                      }
              }
              aria-hidden="true"
            />
            {isCurrent && (
              <span className="absolute top-full mt-1.5 h-1 w-1 rounded-full bg-[var(--on-surface-variant)] opacity-70" aria-hidden="true" />
            )}
          </div>
        )
      })}
    </div>
  )
}
