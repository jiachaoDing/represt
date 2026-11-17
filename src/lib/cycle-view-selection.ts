// View state only. Slot identity survives reordering and repeated templates.
let viewedSlotId: string | null = null
let returnSlotId: string | null = null

export function getViewedCycleSlotId() {
  return viewedSlotId
}

export function setViewedCycleSlotId(slotId: string | null, fromExpandedView = false) {
  viewedSlotId = slotId
  returnSlotId = fromExpandedView ? slotId : null
}

export function getCycleReturnSlotId() {
  return returnSlotId
}
