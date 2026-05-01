import type {
  SessionPlanItem,
  SessionTemplateExerciseSnapshot,
  TemplateExercise,
  WorkoutSession,
} from '../models/types'
import { getTodaySessionDateKey } from '../lib/session-date-key'
import { resolveCatalogExerciseId } from '../lib/exercise-name'
import { db } from './app-db'
import { getTodayTrainingCycleDay, getTrainingCycle } from './training-cycle'
import { getPerformedExerciseForPlanItem, getSessionPlanItems, getSessionRecord, nowIso } from './session-core'
import type { SessionPlanItemInput, TemplateSyncResult, TemplateSyncStatus } from './session-types'

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

function createTemplateExerciseSnapshot(
  exercise: TemplateExercise,
): SessionTemplateExerciseSnapshot {
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

async function buildPlanItemsFromTemplate(
  sessionId: string,
  templateId: string,
  startOrder = 0,
  templateExerciseIds?: string[],
) {
  const templateExercises = await db.templateExercises.where('templateId').equals(templateId).toArray()
  const selectedTemplateExerciseIds = templateExerciseIds ? new Set(templateExerciseIds) : null
  const sortedTemplateExercises = templateExercises
    .filter((exercise) =>
      selectedTemplateExerciseIds ? selectedTemplateExerciseIds.has(exercise.id) : true,
    )
    .sort((left, right) => left.order - right.order)
  const timestamp = nowIso()

  return sortedTemplateExercises.map((exercise, index) => ({
    id: crypto.randomUUID(),
    sessionId,
    templateExerciseId: exercise.id,
    sourceTemplateId: templateId,
    sourceTemplateSnapshot: createTemplateExerciseSnapshot(exercise),
    origin: 'template',
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

async function replaceSessionPlanFromTemplate(
  session: WorkoutSession,
  templateId: string | null,
) {
  const timestamp = nowIso()

  if (!templateId) {
    await db.transaction('rw', db.workoutSessions, db.sessionPlanItems, async () => {
      await db.sessionPlanItems.where('sessionId').equals(session.id).delete()
      await db.workoutSessions.update(session.id, {
        plannedTemplateId: null,
        plannedTemplateNameSnapshot: null,
        plannedTemplateSelectedAt: timestamp,
        lastSyncedTemplateUpdatedAt: null,
      })
    })

    return {
      ...session,
      plannedTemplateId: null,
      plannedTemplateNameSnapshot: null,
      plannedTemplateSelectedAt: timestamp,
      lastSyncedTemplateUpdatedAt: null,
    } satisfies WorkoutSession
  }

  const template = await db.workoutTemplates.get(templateId)
  if (!template) {
    return session
  }

  const nextPlanItems = await buildPlanItemsFromTemplate(session.id, templateId)

  await db.transaction('rw', db.workoutSessions, db.sessionPlanItems, async () => {
    await db.sessionPlanItems.where('sessionId').equals(session.id).delete()
    if (nextPlanItems.length > 0) {
      await db.sessionPlanItems.bulkAdd(nextPlanItems)
    }
    await db.workoutSessions.update(session.id, {
      plannedTemplateId: templateId,
      plannedTemplateNameSnapshot: template.name,
      plannedTemplateSelectedAt: timestamp,
      lastSyncedTemplateUpdatedAt: template.updatedAt,
    })
  })

  return {
    ...session,
    plannedTemplateId: templateId,
    plannedTemplateNameSnapshot: template.name,
    plannedTemplateSelectedAt: timestamp,
    lastSyncedTemplateUpdatedAt: template.updatedAt,
  } satisfies WorkoutSession
}

export async function maybeAutoImportTrainingCycleTemplate(session: WorkoutSession) {
  if (session.sessionDateKey !== getTodaySessionDateKey()) {
    return session
  }

  const cycle = await getTrainingCycle()
  const todayCycleDay = getTodayTrainingCycleDay(cycle)
  const templateId = todayCycleDay?.slot.templateId ?? null

  if (session.plannedTemplateSelectedAt && session.plannedTemplateId === templateId) {
    return session
  }

  if (!templateId && !session.plannedTemplateId && session.plannedTemplateSelectedAt) {
    return session
  }

  return replaceSessionPlanFromTemplate(session, templateId)
}

export async function getSessionTemplateSyncStatus(
  sessionId: string,
): Promise<TemplateSyncStatus> {
  const session = await getSessionRecord(sessionId)
  const templateId = session?.plannedTemplateId ?? null
  if (!session || !templateId) {
    return { hasUpdates: false, templateName: null }
  }

  const template = await db.workoutTemplates.get(templateId)
  if (!template) {
    return { hasUpdates: false, templateName: null }
  }

  const lastSyncedAt = session.lastSyncedTemplateUpdatedAt ?? session.plannedTemplateSelectedAt ?? session.createdAt

  return {
    hasUpdates: template.updatedAt > lastSyncedAt,
    templateName: template.name,
  }
}

export async function syncSessionPlanFromTemplate(sessionId: string): Promise<TemplateSyncResult> {
  const session = await getSessionRecord(sessionId)
  const templateId = session?.plannedTemplateId ?? null
  if (!session || session.sessionDateKey !== getTodaySessionDateKey() || !templateId) {
    throw new Error('只能同步今天安排的模板。')
  }

  const [template, templateExercises, visiblePlanItems] = await Promise.all([
    db.workoutTemplates.get(templateId),
    db.templateExercises.where('templateId').equals(templateId).toArray(),
    getSessionPlanItems(sessionId),
  ])

  if (!template) {
    throw new Error('模板不存在。')
  }

  await replaceSessionPlanFromTemplate(session, templateId)

  return {
    addedCount: templateExercises.length,
    updatedCount: 0,
    removedCount: visiblePlanItems.length,
  }
}

export async function markSessionTemplateSynced(
  sessionId: string,
  templateId: string,
  templateUpdatedAt: string,
) {
  const session = await getSessionRecord(sessionId)
  if (!session || session.plannedTemplateId !== templateId) {
    return
  }

  await db.workoutSessions.update(sessionId, {
    lastSyncedTemplateUpdatedAt: templateUpdatedAt,
  })
}

export async function addTemplateExercisesToSessionPlan(
  sessionId: string,
  templateId: string,
  templateExerciseIds?: string[],
) {
  const [session, template] = await Promise.all([
    getSessionRecord(sessionId),
    db.workoutTemplates.get(templateId),
  ])

  if (!session || session.sessionDateKey !== getTodaySessionDateKey()) {
    throw new Error('只能把模板动作加入今天的训练。')
  }

  if (!template) {
    throw new Error('模板不存在。')
  }

  const existingPlanItems = await getSessionPlanItems(sessionId)
  const nextOrder = existingPlanItems.reduce((maxOrder, item) => Math.max(maxOrder, item.order), -1) + 1
  const planItems = await buildPlanItemsFromTemplate(
    sessionId,
    templateId,
    nextOrder,
    templateExerciseIds,
  )

  if (planItems.length === 0) {
    return []
  }

  await db.sessionPlanItems.bulkAdd(planItems)

  return planItems
}

export async function addTemporarySessionPlanItem(sessionId: string, input: Partial<SessionPlanItemInput>) {
  const session = await getSessionRecord(sessionId)
  if (!session) {
    throw new Error('当前训练不存在。')
  }

  const normalized = normalizeSessionPlanItem(input)
  const planItems = await getSessionPlanItems(sessionId)
  const nextOrder = planItems.reduce((maxOrder, item) => Math.max(maxOrder, item.order), -1) + 1

  const planItem: SessionPlanItem = {
    id: crypto.randomUUID(),
    sessionId,
    templateExerciseId: null,
    sourceTemplateId: null,
    sourceTemplateSnapshot: null,
    origin: 'manual',
    name: normalized.name,
    catalogExerciseId: normalized.catalogExerciseId,
    targetSets: normalized.targetSets,
    defaultWeightKg: normalized.defaultWeightKg,
    defaultReps: normalized.defaultReps,
    defaultDurationSeconds: normalized.defaultDurationSeconds,
    defaultDistanceMeters: normalized.defaultDistanceMeters,
    restSeconds: normalized.restSeconds,
    order: nextOrder,
    createdAt: nowIso(),
  }

  await db.sessionPlanItems.add(planItem)

  return planItem
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
    templateExerciseId: null,
    sourceTemplateId: null,
    sourceTemplateSnapshot: null,
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
