import type { TemplateWithExercises } from '../../db/templates'
import type { TemplateColor } from '../../lib/template-color'
import type { TrainingCycleSlot } from '../../models/types'

export type TrainingCycleSlotRenderData = {
  color: TemplateColor | null
  isToday: boolean
  template: TemplateWithExercises | null
  weekdayLabel: string
}

export type TrainingCycleSlotRowProps = TrainingCycleSlotRenderData & {
  index: number
  isDragging?: boolean
  isSorting?: boolean
  isSubmitting: boolean
  onCalibrateToday: (slotId: string) => void
  onOpenSheet: (slotId: string) => void
  slot: TrainingCycleSlot
}

export type TrainingCycleSlotListItem = TrainingCycleSlotRenderData & {
  index: number
  slot: TrainingCycleSlot
}
