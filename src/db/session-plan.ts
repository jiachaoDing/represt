import type {
  SessionPlanItem,
  SessionPlanExerciseSnapshot,
  PlanExercise,
  WorkoutSession,
} from '../models/types'
import { getTodaySessionDateKey } from '../lib/session-date-key'
import { resolveCatalogExerciseId } from '../lib/exercise-name'
import { db } from './app-db'
import { getTodayTrainingCycleDay, getTrainingCycle } from './training-cycle'
import { getPerformedExerciseForPlanItem, getSessionPlanItems, getSessionRecord, nowIso } from './session-core'
import type { SessionPlanItemInput, PlanSyncResult, PlanSyncStatus } from './session-types'

function normalizeSessionPlanItem(input: Partial<SessionPlanItemInput>) {
  const name = input.name?.trim() || '未命名动作'

  return {
    name,
    catalogExerciseId: resolveCatalogExerciseId({ name, catalogExerciseId: input.catalogExerciseId }),
    targetSets: Math.max(1, Math.floor(input.targetSets ?? 3)),
    restSeconds: Math.max(0, Math.floor(input.restSeconds ?? 90)),
    defaultWeightKg: input.defaultWeightKg ?? null,
    defaultReps: input.defaultReps ?? null,
    defaultDurationSeconds: input.defaultDurationSeconds ?? null,
    defaultDistanceMeters: input.defaultDistanceMeters ?? null,
  }
}

function createPlanExerciseSnapshot(
  exercise: PlanExercise,
): SessionPlanExerciseSnapshot {
  return {
    name: exercise.name,
    catalogExerciseId: exercise.catalogExerciseId ?? null,
    targetSets: exercise.targetSets,
    defaultWeightKg: exercise.weightKg ?? null,
    defaultReps: exercise.reps ?? null,
    defaultDurationSeconds: exercise.durationSeconds ?? null,
    defaultDistanceMeters: exercise.distanceMeters ?? null,
    restSeconds: exercise.restSeconds,
    order: exercise.order,
  }
}

async function buildPlanItemsFromPlan(
  sessionId: string,
  planId: string,
  startOrder = 0,
  planExerciseIds?: string[],
) {
  const planExercises = await db.planExercises.where('planId').equals(planId).toArray()
  const selectedPlanExerciseIds = planExerciseIds ? new Set(planExerciseIds) : null
  const sortedPlanExercises = planExercises
    .filter((exercise) =>
      selectedPlanExerciseIds ? selectedPlanExerciseIds.has(exercise.id) : true,
    )
    .sort((left, right) => left.order - right.order)
  const timestamp = nowIso()

  return sortedPlanExercises.map((exercise, index) => ({
    id: crypto.randomUUID(),
    sessionId,
    planExerciseId: exercise.id,
    sourcePlanId: planId,
    sourcePlanSnapshot: createPlanExerciseSnapshot(exercise),
    origin: 'plan',
    name: exercise.name,
    catalogExerciseId: exercise.catalogExerciseId ?? null,
    targetSets: exercise.targetSets,
    defaultWeightKg: exercise.weightKg ?? null,
    defaultReps: exercise.reps ?? null,
    defaultDurationSeconds: exercise.durationSeconds ?? null,
    defaultDistanceMeters: exercise.distanceMeters ?? null,
    restSeconds: exercise.restSeconds,
    order: startOrder + index,
    createdAt: timestamp,
  })) satisfies SessionPlanItem[]
}

async function replaceSessionPlanFromPlan(
  session: WorkoutSession,
  planId: string | null,
) {
  const timestamp = nowIso()

  if (!planId) {
    await db.transaction('rw', db.workoutSessions, db.sessionPlanItems, async () => {
      await db.sessionPlanItems.where('sessionId').equals(session.id).delete()
      await db.workoutSessions.update(session.id, {
        plannedPlanId: null,
        plannedPlanNameSnapshot: null,
        plannedPlanSelectedAt: timestamp,
        lastSyncedPlanUpdatedAt: null,
      })
    })

    return {
      ...session,
      plannedPlanId: null,
      plannedPlanNameSnapshot: null,
      plannedPlanSelectedAt: timestamp,
      lastSyncedPlanUpdatedAt: null,
    } satisfies WorkoutSession
  }

  const plan = await db.workoutPlans.get(planId)
  if (!plan) {
    return session
  }

  const nextPlanItems = await buildPlanItemsFromPlan(session.id, planId)

  await db.transaction('rw', db.workoutSessions, db.sessionPlanItems, async () => {
    await db.sessionPlanItems.where('sessionId').equals(session.id).delete()
    if (nextPlanItems.length > 0) {
      await db.sessionPlanItems.bulkAdd(nextPlanItems)
    }
    await db.workoutSessions.update(session.id, {
      plannedPlanId: planId,
      plannedPlanNameSnapshot: plan.name,
      plannedPlanSelectedAt: timestamp,
      lastSyncedPlanUpdatedAt: plan.updatedAt,
    })
  })

  return {
    ...session,
    plannedPlanId: planId,
    plannedPlanNameSnapshot: plan.name,
    plannedPlanSelectedAt: timestamp,
    lastSyncedPlanUpdatedAt: plan.updatedAt,
  } satisfies WorkoutSession
}

export async function maybeAutoImportTrainingCyclePlan(session: WorkoutSession) {
  if (session.sessionDateKey !== getTodaySessionDateKey()) {
    return session
  }

  const cycle = await getTrainingCycle()
  const todayCycleDay = getTodayTrainingCycleDay(cycle)
  const planId = todayCycleDay?.slot.planId ?? null

  if (session.plannedPlanSelectedAt && session.plannedPlanId === planId) {
    return session
  }

  if (!planId && !session.plannedPlanId && session.plannedPlanSelectedAt) {
    return session
  }

  return replaceSessionPlanFromPlan(session, planId)
}

export async function getSessionPlanSyncStatus(
  sessionId: string,
): Promise<PlanSyncStatus> {
  const session = await getSessionRecord(sessionId)
  const planId = session?.plannedPlanId ?? null
  if (!session || !planId) {
    return { hasUpdates: false, planName: null }
  }

  const plan = await db.workoutPlans.get(planId)
  if (!plan) {
    return { hasUpdates: false, planName: null }
  }

  const lastSyncedAt = session.lastSyncedPlanUpdatedAt ?? session.plannedPlanSelectedAt ?? session.createdAt

  return {
    hasUpdates: plan.updatedAt > lastSyncedAt,
    planName: plan.name,
  }
}

export async function syncSessionPlanFromPlan(sessionId: string): Promise<PlanSyncResult> {
  const session = await getSessionRecord(sessionId)
  const planId = session?.plannedPlanId ?? null
  if (!session || session.sessionDateKey !== getTodaySessionDateKey() || !planId) {
    throw new Error('只能同步今天安排的计划。')
  }

  const [plan, planExercises, visiblePlanItems] = await Promise.all([
    db.workoutPlans.get(planId),
    db.planExercises.where('planId').equals(planId).toArray(),
    getSessionPlanItems(sessionId),
  ])

  if (!plan) {
    throw new Error('计划不存在。')
  }

  await replaceSessionPlanFromPlan(session, planId)

  return {
    addedCount: planExercises.length,
    updatedCount: 0,
    removedCount: visiblePlanItems.length,
  }
}

export async function markSessionPlanSynced(
  sessionId: string,
  planId: string,
  planUpdatedAt: string,
) {
  const session = await getSessionRecord(sessionId)
  if (!session || session.plannedPlanId !== planId) {
    return
  }

  await db.workoutSessions.update(sessionId, {
    lastSyncedPlanUpdatedAt: planUpdatedAt,
  })
}

export async function addPlanExercisesToSessionPlan(
  sessionId: string,
  planId: string,
  planExerciseIds?: string[],
) {
  const [session, plan] = await Promise.all([
    getSessionRecord(sessionId),
    db.workoutPlans.get(planId),
  ])

  if (!session || session.sessionDateKey !== getTodaySessionDateKey()) {
    throw new Error('只能把计划动作加入今天的训练。')
  }

  if (!plan) {
    throw new Error('计划不存在。')
  }

  const existingPlanItems = await getSessionPlanItems(sessionId)
  const nextOrder = existingPlanItems.reduce((maxOrder, item) => Math.max(maxOrder, item.order), -1) + 1
  const planItems = await buildPlanItemsFromPlan(
    sessionId,
    planId,
    nextOrder,
    planExerciseIds,
  )

  if (planItems.length === 0) {
    return []
  }

  await db.sessionPlanItems.bulkAdd(planItems)

  return planItems
}

export async function addTemporarySessionPlanItem(sessionId: string, input: Partial<SessionPlanItemInput>) {
  const planItems = await addTemporarySessionPlanItems(sessionId, [input])

  return planItems[0]
}

export async function addTemporarySessionPlanItems(
  sessionId: string,
  inputs: Partial<SessionPlanItemInput>[],
) {
  const session = await getSessionRecord(sessionId)
  if (!session) {
    throw new Error('当前训练不存在。')
  }

  if (inputs.length === 0) {
    return []
  }

  const planItems = await getSessionPlanItems(sessionId)
  const nextOrder = planItems.reduce((maxOrder, item) => Math.max(maxOrder, item.order), -1) + 1
  const timestamp = nowIso()

  const nextPlanItems = inputs.map((input, index) => {
    const normalized = normalizeSessionPlanItem(input)

    return {
      id: crypto.randomUUID(),
      sessionId,
      planExerciseId: null,
      sourcePlanId: null,
      sourcePlanSnapshot: null,
      origin: 'manual',
      name: normalized.name,
      catalogExerciseId: normalized.catalogExerciseId,
      targetSets: normalized.targetSets,
      defaultWeightKg: normalized.defaultWeightKg,
      defaultReps: normalized.defaultReps,
      defaultDurationSeconds: normalized.defaultDurationSeconds,
      defaultDistanceMeters: normalized.defaultDistanceMeters,
      restSeconds: normalized.restSeconds,
      order: nextOrder + index,
      createdAt: timestamp,
    }
  }) satisfies SessionPlanItem[]

  await db.sessionPlanItems.bulkAdd(nextPlanItems)

  return nextPlanItems
}

export async function replaceSessionPlanItem(
  sessionId: string,
  planItemId: string,
  input: Partial<SessionPlanItemInput>,
) {
  const [session, planItem, performedExercise] = await Promise.all([
    getSessionRecord(sessionId),
    db.sessionPlanItems.get(planItemId),
    getPerformedExerciseForPlanItem(planItemId),
  ])

  if (!session || session.sessionDateKey !== getTodaySessionDateKey()) {
    throw new Error('只能修改今天的训练。')
  }

  if (!planItem || planItem.sessionId !== sessionId) {
    throw new Error('当前动作不存在。')
  }

  const normalized = normalizeSessionPlanItem(input)
  const timestamp = nowIso()
  const nextPlanItem: SessionPlanItem = {
    id: crypto.randomUUID(),
    sessionId,
    planExerciseId: null,
    sourcePlanId: null,
    sourcePlanSnapshot: null,
    origin: 'manual',
    name: normalized.name,
    catalogExerciseId: normalized.catalogExerciseId,
    targetSets: normalized.targetSets,
    defaultWeightKg: normalized.defaultWeightKg,
    defaultReps: normalized.defaultReps,
    defaultDurationSeconds: normalized.defaultDurationSeconds,
    defaultDistanceMeters: normalized.defaultDistanceMeters,
    restSeconds: normalized.restSeconds,
    order: planItem.order,
    createdAt: timestamp,
  }

  await db.transaction('rw', db.sessionPlanItems, db.performedExercises, async () => {
    if (performedExercise) {
      await db.performedExercises.update(performedExercise.id, { planItemId: null })
    }
    await db.sessionPlanItems.delete(planItem.id)
    await db.sessionPlanItems.add(nextPlanItem)
  })

  return nextPlanItem
}

export async function deletePendingSessionPlanItem(sessionId: string, planItemId: string) {
  const [session, planItem, performedExercise] = await Promise.all([
    getSessionRecord(sessionId),
    db.sessionPlanItems.get(planItemId),
    getPerformedExerciseForPlanItem(planItemId),
  ])

  if (!session || !planItem || planItem.sessionId !== sessionId) {
    throw new Error('当前动作不存在。')
  }

  await db.transaction('rw', db.sessionPlanItems, db.performedExercises, async () => {
    if (performedExercise) {
      await db.performedExercises.update(performedExercise.id, { planItemId: null })
    }
    await db.sessionPlanItems.delete(planItemId)
  })
}

export async function reorderSessionPlanItems(sessionId: string, orderedPlanItemIds: string[]) {
  const planItems = await getSessionPlanItems(sessionId)
  if (planItems.length !== orderedPlanItemIds.length) {
    return
  }

  const planItemIdSet = new Set(planItems.map((item) => item.id))
  if (orderedPlanItemIds.some((planItemId) => !planItemIdSet.has(planItemId))) {
    return
  }

  await db.transaction('rw', db.sessionPlanItems, db.performedExercises, async () => {
    await Promise.all(
      orderedPlanItemIds.map(async (planItemId, order) => {
        await db.sessionPlanItems.update(planItemId, { order })
        const performedExercise = await getPerformedExerciseForPlanItem(planItemId)
        if (performedExercise) {
          await db.performedExercises.update(performedExercise.id, { order })
        }
      }),
    )
  })
}
