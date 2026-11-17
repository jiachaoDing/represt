import type { PlanWithExercises } from '../../db/plans'
import type { PlanColor } from '../../lib/plan-color'
import type { TrainingCycleSlot } from '../../models/types'

export type TrainingCycleSlotRenderData = {
  color: PlanColor | null
  isToday: boolean
  plan: PlanWithExercises | null
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
