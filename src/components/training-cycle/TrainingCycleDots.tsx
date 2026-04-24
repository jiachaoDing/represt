import type { TrainingCycleSlot } from '../../models/types'
import type { TemplateColor } from '../../lib/template-color'

type TrainingCycleDotsProps = {
  currentIndex?: number | null
  getTemplateColor: (templateId: string) => TemplateColor | null
  highlightedTemplateId?: string | null
  slots: TrainingCycleSlot[]
}

export function TrainingCycleDots({
  currentIndex = null,
  getTemplateColor,
  highlightedTemplateId = null,
  slots,
}: TrainingCycleDotsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {slots.map((slot, index) => {
        const color = slot.templateId ? getTemplateColor(slot.templateId) : null
        const isCurrent = currentIndex === index
        const isHighlighted = highlightedTemplateId
          ? slot.templateId === highlightedTemplateId
          : slot.templateId !== null

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
                  : slot.templateId && color
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
