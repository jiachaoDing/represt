import { forwardRef, type ButtonHTMLAttributes } from 'react'

import type { PlanColor } from '../../lib/plan-color'

type PlanTemplateChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & {
  color: PlanColor
  selected: boolean
}

export const PlanTemplateChip = forwardRef<HTMLButtonElement, PlanTemplateChipProps>(
  function PlanTemplateChip({ children, color, selected, className = '', ...props }, ref) {
    return (
      <button
        {...props}
        ref={ref}
        type="button"
        aria-pressed={selected}
        className={`flex h-8 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors tap-highlight-transparent disabled:opacity-40 ${selected ? 'border-2' : 'border hover:opacity-90'} ${className}`}
        style={{
          backgroundColor: color.soft,
          borderColor: selected ? 'var(--cycle-focus)' : `color-mix(in srgb, ${color.solid} 46%, transparent)`,
          color: color.text,
        }}
      >
        {children}
      </button>
    )
  },
)
