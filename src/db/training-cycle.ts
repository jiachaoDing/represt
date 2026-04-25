import { getTodaySessionDateKey, diffSessionDateKeys } from '../lib/session-date-key'
import type { TrainingCycle, TrainingCycleSlot } from '../models/types'

import { db } from './app-db'

const TRAINING_CYCLE_ID = 'default'

function nowIso() {
  return new Date().toISOString()
}

function normalizeIndex(index: number, length: number) {
  if (length <= 0) {
    return 0
  }

  return ((index % length) + length) % length
}

function createEmptyTrainingCycle() {
  return {
    id: TRAINING_CYCLE_ID,
    slots: [],
    anchorDateKey: getTodaySessionDateKey(),
    anchorIndex: 0,
    updatedAt: nowIso(),
  } satisfies TrainingCycle
}

function withNormalizedAnchorIndex(cycle: TrainingCycle) {
  if (cycle.slots.length === 0) {
    return {
      ...cycle,
      anchorIndex: 0,
    } satisfies TrainingCycle
  }

  return {
    ...cycle,
    anchorIndex: normalizeIndex(cycle.anchorIndex, cycle.slots.length),
  } satisfies TrainingCycle
}

export type TrainingCycleDay = {
  index: number
  slot: TrainingCycleSlot
}

export async function getTrainingCycle() {
  const cycle = await db.trainingCycles.get(TRAINING_CYCLE_ID)
  return cycle ? withNormalizedAnchorIndex(cycle) : null
}

export async function getOrCreateTrainingCycle() {
  const current = await getTrainingCycle()
  if (current) {
    return current
  }

  const nextCycle = createEmptyTrainingCycle()
  await db.trainingCycles.add(nextCycle)
  return nextCycle
}

export function getTrainingCycleDayForDate(cycle: TrainingCycle | null, sessionDateKey: string) {
  if (!cycle || cycle.slots.length === 0) {
    return null
  }

  const diffDays = diffSessionDateKeys(sessionDateKey, cycle.anchorDateKey)
  const index = normalizeIndex(cycle.anchorIndex + diffDays, cycle.slots.length)

  return {
    index,
    slot: cycle.slots[index],
  } satisfies TrainingCycleDay
}

export function getTodayTrainingCycleDay(cycle: TrainingCycle | null) {
  return getTrainingCycleDayForDate(cycle, getTodaySessionDateKey())
}

export function getTrainingCycleTemplateDaysUntil(
  cycle: TrainingCycle | null,
  templateId: string,
  sessionDateKey = getTodaySessionDateKey(),
) {
  const day = getTrainingCycleDayForDate(cycle, sessionDateKey)
  if (!cycle || cycle.slots.length === 0 || !day) {
    return null
  }

  for (let offset = 0; offset < cycle.slots.length; offset += 1) {
    const index = normalizeIndex(day.index + offset, cycle.slots.length)
    if (cycle.slots[index].templateId === templateId) {
      return offset
    }
  }

  return null
}

export function getTrainingCycleTemplateIndexes(cycle: TrainingCycle | null, templateId: string) {
  if (!cycle) {
    return [] as number[]
  }

  return cycle.slots.reduce<number[]>((indexes, slot, index) => {
    if (slot.templateId === templateId) {
      indexes.push(index)
    }

    return indexes
  }, [])
}

async function saveTrainingCycle(cycle: TrainingCycle) {
  const nextCycle = withNormalizedAnchorIndex({
    ...cycle,
    updatedAt: nowIso(),
  })

  await db.trainingCycles.put(nextCycle)
  return nextCycle
}

export async function addTrainingCycleSlot() {
  const cycle = await getOrCreateTrainingCycle()

  return saveTrainingCycle({
    ...cycle,
    slots: [
      ...cycle.slots,
      {
        id: crypto.randomUUID(),
        templateId: null,
      },
    ],
  })
}

export async function removeTrainingCycleSlot(slotId: string) {
  const cycle = await getOrCreateTrainingCycle()
  const slotIndex = cycle.slots.findIndex((slot) => slot.id === slotId)

  if (slotIndex < 0) {
    return cycle
  }

  const nextSlots = cycle.slots.filter((slot) => slot.id !== slotId)
  if (nextSlots.length === 0) {
    return saveTrainingCycle({
      ...cycle,
      slots: [],
      anchorIndex: 0,
    })
  }

  let nextAnchorIndex = cycle.anchorIndex

  if (slotIndex < cycle.anchorIndex) {
    nextAnchorIndex -= 1
  } else if (slotIndex === cycle.anchorIndex && nextAnchorIndex >= nextSlots.length) {
    nextAnchorIndex = 0
  }

  return saveTrainingCycle({
    ...cycle,
    slots: nextSlots,
    anchorIndex: nextAnchorIndex,
  })
}

export async function assignTemplateToTrainingCycleSlot(slotId: string, templateId: string | null) {
  const cycle = await getOrCreateTrainingCycle()

  return saveTrainingCycle({
    ...cycle,
    slots: cycle.slots.map((slot) =>
      slot.id === slotId
        ? {
            ...slot,
            templateId,
          }
        : slot,
    ),
  })
}

export async function calibrateTrainingCycleToday(slotId: string) {
  const cycle = await getOrCreateTrainingCycle()
  const slotIndex = cycle.slots.findIndex((slot) => slot.id === slotId)

  if (slotIndex < 0) {
    return cycle
  }

  return saveTrainingCycle({
    ...cycle,
    anchorDateKey: getTodaySessionDateKey(),
    anchorIndex: slotIndex,
  })
}

export async function reorderTrainingCycleSlots(orderedSlotIds: string[]) {
  const cycle = await getOrCreateTrainingCycle()

  const orderedSlotIdSet = new Set(orderedSlotIds)
  if (
    cycle.slots.length !== orderedSlotIds.length ||
    orderedSlotIdSet.size !== orderedSlotIds.length
  ) {
    return cycle
  }

  const slotMap = new Map(cycle.slots.map((slot) => [slot.id, slot]))
  if (orderedSlotIds.some((slotId) => !slotMap.has(slotId))) {
    return cycle
  }

  const anchorSlotId = cycle.slots[cycle.anchorIndex]?.id
  const nextSlots = orderedSlotIds
    .map((slotId) => slotMap.get(slotId))
    .filter((slot): slot is TrainingCycleSlot => slot !== undefined)
  const nextAnchorIndex = Math.max(
    0,
    nextSlots.findIndex((slot) => slot.id === anchorSlotId),
  )

  return saveTrainingCycle({
    ...cycle,
    slots: nextSlots,
    anchorIndex: nextAnchorIndex,
  })
}

export async function clearTemplateFromTrainingCycle(templateId: string) {
  const cycle = await getTrainingCycle()
  if (!cycle) {
    return null
  }

  const shouldClear = cycle.slots.some((slot) => slot.templateId === templateId)
  if (!shouldClear) {
    return cycle
  }

  return saveTrainingCycle({
    ...cycle,
    slots: cycle.slots.map((slot) =>
      slot.templateId === templateId
        ? {
            ...slot,
            templateId: null,
          }
        : slot,
    ),
  })
}
