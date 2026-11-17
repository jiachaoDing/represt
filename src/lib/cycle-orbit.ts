import type { TrainingCycleSlot } from '../models/types'

// Derived view flags only. Template identity and workout progress are independent.
export function getCycleNodeState(
  slot: TrainingCycleSlot,
  focusedSlotId: string | null,
  todaySlotId: string | null,
) {
  return {
    focused: slot.id === focusedSlotId,
    today: slot.id === todaySlotId,
  }
}
