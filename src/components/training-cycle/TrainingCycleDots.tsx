import type { TrainingCycleSlot } from '../../models/types'
import type { PlanColor } from '../../lib/plan-color'
import { restDayColor } from '../../lib/plan-color'

type TrainingCycleDotsProps = {
  currentIndex?: number | null
  getPlanColor: (planId: string) => PlanColor | null
  highlightedPlanId?: string | null
  slots: TrainingCycleSlot[]
  selectedIndex?: number | null
  onSelect?: (index: number) => void
  getDayLabel?: (index: number) => string
  disabled?: boolean
}

export function TrainingCycleDots({
  currentIndex = null,
  getPlanColor,
  highlightedPlanId = null,
  slots,
  selectedIndex = null,
  onSelect,
  getDayLabel,
  disabled = false,
}: TrainingCycleDotsProps) {
  const DotContainer = onSelect ? 'button' : 'div'
  return (
    <div className={onSelect ? 'flex flex-wrap items-center gap-0.5' : 'flex flex-wrap items-center gap-2'}>
      {slots.map((slot, index) => {
        const color = slot.planId ? getPlanColor(slot.planId) : null
        const palette = color ?? restDayColor
        const isCurrent = currentIndex === index
        const isHighlighted = highlightedPlanId !== null && slot.planId === highlightedPlanId

        return (
          <DotContainer
            key={slot.id}
            type={onSelect ? 'button' : undefined}
            onClick={onSelect ? () => onSelect(index) : undefined}
            disabled={onSelect ? disabled : undefined}
            aria-label={getDayLabel?.(index)}
            aria-pressed={onSelect ? selectedIndex === index : undefined}
            aria-current={onSelect && isCurrent ? 'date' : undefined}
            className={onSelect
              ? 'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-[var(--primary)] disabled:opacity-40 tap-highlight-transparent'
              : 'relative flex flex-col items-center'}
          >
            <span
              className={[
                'block h-3.5 w-3.5 rounded-full border transition-transform',
                isHighlighted ? 'outline-1 outline-offset-2' : '',
                onSelect
                  ? selectedIndex === index ? 'scale-110 ring-2 ring-[var(--on-surface)] ring-offset-4 ring-offset-[var(--surface)]' : ''
                  : isCurrent ? 'scale-110 ring-2 ring-[var(--on-surface)]/15 ring-offset-2 ring-offset-[var(--surface)]' : '',
              ].join(' ')}
              style={{
                backgroundColor: palette.solid,
                borderColor: palette.solid,
                outlineColor: isHighlighted ? palette.solid : undefined,
              }}
              aria-hidden="true"
            />
            {isCurrent && (
              <span className={onSelect ? 'absolute bottom-0 h-1 w-1 rounded-full bg-[var(--on-surface-variant)] opacity-70' : 'absolute top-full mt-1.5 h-1 w-1 rounded-full bg-[var(--on-surface-variant)] opacity-70'} aria-hidden="true" />
            )}
          </DotContainer>
        )
      })}
    </div>
  )
}
