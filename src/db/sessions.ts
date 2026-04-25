import type {
  SessionExercise,
  SessionStatus,
  SessionTemplateExerciseSnapshot,
  SetRecord,
  TemplateExercise,
  WorkoutSession,
} from '../models/types'
import { getTodaySessionDateKey } from '../lib/session-date-key'
import { getRestEndsAt } from '../lib/rest-timer'
import { deriveExerciseStatus, type DerivedExerciseStatus } from '../lib/session-display'
import { db } from './app-db'
import { ensureTemplateSeedData } from './templates'
import { getTodayTrainingCycleDay, getTrainingCycle } from './training-cycle'

type WorkoutSessionWithStatus = WorkoutSession & {
  status: SessionStatus
}

type SessionExerciseWithStatus = SessionExercise & {
  status: DerivedExerciseStatus
}

export type WorkoutSessionWithExercises = WorkoutSessionWithStatus & {
  exercises: SessionExerciseWithStatus[]
}

export type SessionExerciseDetail = {
  session: WorkoutSessionWithStatus
  exercise: SessionExerciseWithStatus
  latestSetRecord: SetRecord | null
}

type SessionSummaryExercise = SessionExerciseWithStatus & {
  setRecords: SetRecord[]
}

export type SessionSummaryDetail = {
  session: WorkoutSessionWithStatus
  exercises: SessionSummaryExercise[]
}

export type TemplateSyncStatus = {
  hasUpdates: boolean
  templateName: string | null
}

export type TemplateSyncResult = {
  addedCount: number
  updatedCount: number
  removedCount: number
}

type SessionExerciseInput = {
  name: string
  targetSets?: number
  restSeconds?: number
  defaultReps?: number | null
  defaultWeightKg?: number | null
}

const CURRENT_SESSION_KEY = 'trainre.current-session-id.v1'
let getOrCreateTodaySessionPromise: Promise<WorkoutSessionWithExercises> | null = null

function nowIso() {
  return new Date().toISOString()
}

function getStoredCurrentSessionId() {
  return localStorage.getItem(CURRENT_SESSION_KEY)
}

function setStoredCurrentSessionId(sessionId: string | null) {
  if (sessionId) {
    localStorage.setItem(CURRENT_SESSION_KEY, sessionId)
    return
  }

  localStorage.removeItem(CURRENT_SESSION_KEY)
}

function normalizeSessionExercise(input: Partial<SessionExerciseInput>) {
  return {
    name: input.name?.trim() || '未命名动作',
    targetSets: Math.max(1, Math.floor(input.targetSets ?? 3)),
    restSeconds: Math.max(0, Math.floor(input.restSeconds ?? 90)),
    defaultWeightKg: input.defaultWeightKg ?? null,
    defaultReps: input.defaultReps ?? null,
  }
}

function createTemplateExerciseSnapshot(
  exercise: TemplateExercise,
): SessionTemplateExerciseSnapshot {
  return {
    name: exercise.name,
    targetSets: exercise.targetSets,
    defaultWeightKg: exercise.weightKg ?? null,
    defaultReps: exercise.reps ?? null,
    restSeconds: exercise.restSeconds,
    order: exercise.order,
  }
}

function deriveSessionStatus(
  exercises: Array<Pick<SessionExercise, 'completedSets' | 'targetSets' | 'restEndsAt'>>,
) {
  if (exercises.length === 0) {
    return 'pending' satisfies SessionStatus
  }

  if (exercises.every((exercise) => deriveExerciseStatus(exercise) === 'completed')) {
    return 'completed' satisfies SessionStatus
  }

  if (exercises.some((exercise) => exercise.completedSets > 0)) {
    return 'active' satisfies SessionStatus
  }

  return 'pending' satisfies SessionStatus
}

function attachDerivedExerciseStatus(exercise: SessionExercise) {
  return {
    ...exercise,
    status: deriveExerciseStatus(exercise),
  } satisfies SessionExerciseWithStatus
}

function attachDerivedSessionStatus(
  session: WorkoutSession,
  exercises: Array<Pick<SessionExercise, 'completedSets' | 'targetSets' | 'restEndsAt'>>,
) {
  return {
    ...session,
    status: deriveSessionStatus(exercises),
  } satisfies WorkoutSessionWithStatus
}

async function resolveCurrentSessionId() {
  const todayDateKey = getTodaySessionDateKey()
  const storedSessionId = getStoredCurrentSessionId()
  if (storedSessionId) {
    const storedSession = await db.workoutSessions.get(storedSessionId)
    if (storedSession && storedSession.sessionDateKey === todayDateKey) {
      return storedSession.id
    }

    setStoredCurrentSessionId(null)
  }

  const sessions = await db.workoutSessions.where('sessionDateKey').equals(todayDateKey).toArray()
  const latestTodaySession = sessions.sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]

  if (!latestTodaySession) {
    return null
  }

  setStoredCurrentSessionId(latestTodaySession.id)
  return latestTodaySession.id
}

async function getSessionRecord(sessionId: string) {
  return db.workoutSessions.get(sessionId)
}

async function getSessionRecordByDateKey(sessionDateKey: string) {
  return db.workoutSessions.where('sessionDateKey').equals(sessionDateKey).first()
}

async function getSessionExercises(sessionId: string, options?: { includeArchived?: boolean }) {
  const exercises = await db.sessionExercises.where('sessionId').equals(sessionId).toArray()
  return exercises
    .filter((exercise) => options?.includeArchived || !exercise.archivedAt)
    .sort((left, right) => left.order - right.order)
}

async function getSessionSetRecords(sessionId: string) {
  const setRecords = await db.setRecords.where('sessionId').equals(sessionId).toArray()
  return setRecords.sort((left, right) => left.setNumber - right.setNumber)
}

async function getLatestSetRecord(sessionExerciseId: string) {
  const records = await db.setRecords.where('sessionExerciseId').equals(sessionExerciseId).toArray()

  if (records.length === 0) {
    return null
  }

  return records.sort((left, right) => right.setNumber - left.setNumber)[0]
}

async function createSessionRecord() {
  const timestamp = nowIso()
  const session: WorkoutSession = {
    id: crypto.randomUUID(),
    sessionDateKey: getTodaySessionDateKey(),
    createdAt: timestamp,
    autoImportedTemplateId: null,
    autoImportedAt: null,
    lastSyncedTemplateUpdatedAt: null,
    deletedTemplateExerciseIds: [],
  }

  await db.workoutSessions.add(session)
  setStoredCurrentSessionId(session.id)

  return session
}

async function buildSessionExercisesFromTemplate(
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

  return sortedTemplateExercises.map((exercise, index) => ({
    id: crypto.randomUUID(),
    sessionId,
    templateExerciseId: exercise.id,
    sourceTemplateId: templateId,
    sourceTemplateSnapshot: createTemplateExerciseSnapshot(exercise),
    origin: 'template',
    removedFromTemplate: false,
    archivedAt: null,
    name: exercise.name,
    targetSets: exercise.targetSets,
    defaultWeightKg: exercise.weightKg ?? null,
    defaultReps: exercise.reps ?? null,
    completedSets: 0,
    restSeconds: exercise.restSeconds,
    order: startOrder + index,
    lastCompletedAt: null,
    restEndsAt: null,
  })) satisfies SessionExercise[]
}

async function clearVisibleSessionPlan(sessionId: string, archivedAt: string) {
  const exercises = await getSessionExercises(sessionId)

  await Promise.all(
    exercises.map((exercise) =>
      exercise.completedSets > 0
        ? db.sessionExercises.update(exercise.id, {
            archivedAt,
            restEndsAt: null,
          })
        : db.sessionExercises.delete(exercise.id),
    ),
  )
}

async function replaceVisibleSessionPlanFromTemplate(
  session: WorkoutSession,
  templateId: string | null,
) {
  const timestamp = nowIso()

  if (!templateId) {
    await db.transaction('rw', db.workoutSessions, db.sessionExercises, async () => {
      await clearVisibleSessionPlan(session.id, timestamp)
      await db.workoutSessions.update(session.id, {
        autoImportedTemplateId: null,
        autoImportedAt: timestamp,
        lastSyncedTemplateUpdatedAt: null,
        deletedTemplateExerciseIds: [],
      })
    })

    return {
      ...session,
      autoImportedTemplateId: null,
      autoImportedAt: timestamp,
      lastSyncedTemplateUpdatedAt: null,
      deletedTemplateExerciseIds: [],
    } satisfies WorkoutSession
  }

  const template = await db.workoutTemplates.get(templateId)
  if (!template) {
    return session
  }

  const nextExercises = await buildSessionExercisesFromTemplate(session.id, templateId)

  await db.transaction('rw', db.workoutSessions, db.sessionExercises, async () => {
    await clearVisibleSessionPlan(session.id, timestamp)
    if (nextExercises.length > 0) {
      await db.sessionExercises.bulkAdd(nextExercises)
    }
    await db.workoutSessions.update(session.id, {
      autoImportedTemplateId: templateId,
      autoImportedAt: timestamp,
      lastSyncedTemplateUpdatedAt: template.updatedAt,
      deletedTemplateExerciseIds: [],
    })
  })

  return {
    ...session,
    autoImportedTemplateId: templateId,
    autoImportedAt: timestamp,
    lastSyncedTemplateUpdatedAt: template.updatedAt,
    deletedTemplateExerciseIds: [],
  } satisfies WorkoutSession
}

async function maybeAutoImportTrainingCycleTemplate(session: WorkoutSession) {
  if (session.sessionDateKey !== getTodaySessionDateKey()) {
    return session
  }

  const cycle = await getTrainingCycle()
  const todayCycleDay = getTodayTrainingCycleDay(cycle)
  const templateId = todayCycleDay?.slot.templateId ?? null

  if (session.autoImportedAt && session.autoImportedTemplateId === templateId) {
    return session
  }

  if (!templateId && !session.autoImportedTemplateId && session.autoImportedAt) {
    return session
  }

  return replaceVisibleSessionPlanFromTemplate(session, templateId)
}

export async function getCurrentSession() {
  await ensureTemplateSeedData()

  const sessionId = await resolveCurrentSessionId()
  if (!sessionId) {
    return null
  }

  const session = await getSessionRecord(sessionId)
  if (!session) {
    setStoredCurrentSessionId(null)
    return null
  }

  const hydratedSession = await maybeAutoImportTrainingCycleTemplate(session)
  const exercises = await getSessionExercises(hydratedSession.id)
  return {
    ...attachDerivedSessionStatus(hydratedSession, exercises),
    exercises: exercises.map(attachDerivedExerciseStatus),
  } satisfies WorkoutSessionWithExercises
}

export async function getOrCreateTodaySession() {
  if (getOrCreateTodaySessionPromise) {
    return getOrCreateTodaySessionPromise
  }

  getOrCreateTodaySessionPromise = (async () => {
    const currentSession = await getCurrentSession()
    if (currentSession) {
      return currentSession
    }

    const session = await createSessionRecord()
    return {
      ...attachDerivedSessionStatus(session, []),
      exercises: [],
    } satisfies WorkoutSessionWithExercises
  })()

  try {
    return await getOrCreateTodaySessionPromise
  } finally {
    getOrCreateTodaySessionPromise = null
  }
}

export async function getSessionExerciseDetail(sessionExerciseId: string) {
  const exercise = await db.sessionExercises.get(sessionExerciseId)
  if (!exercise) {
    return null
  }

  const [session, latestSetRecord] = await Promise.all([
    getSessionRecord(exercise.sessionId),
    getLatestSetRecord(sessionExerciseId),
  ])

  if (!session) {
    return null
  }

  return {
    session: attachDerivedSessionStatus(session, [exercise]),
    exercise: attachDerivedExerciseStatus(exercise),
    latestSetRecord,
  } satisfies SessionExerciseDetail
}

export async function getSessionSummaryDetail(sessionId: string) {
  const [session, exercises, setRecords] = await Promise.all([
    getSessionRecord(sessionId),
    getSessionExercises(sessionId, { includeArchived: true }),
    getSessionSetRecords(sessionId),
  ])

  if (!session) {
    return null
  }

  const setRecordsByExerciseId = new Map<string, SetRecord[]>()

  for (const setRecord of setRecords) {
    const current = setRecordsByExerciseId.get(setRecord.sessionExerciseId) ?? []
    current.push(setRecord)
    setRecordsByExerciseId.set(setRecord.sessionExerciseId, current)
  }

  return {
    session: attachDerivedSessionStatus(session, exercises),
    exercises: exercises
      .map((exercise) => ({
        ...attachDerivedExerciseStatus(exercise),
        setRecords: setRecordsByExerciseId.get(exercise.id) ?? [],
      }))
      .filter((exercise) => exercise.completedSets > 0 || exercise.setRecords.length > 0),
  } satisfies SessionSummaryDetail
}

export async function getSessionSummaryDetailByDateKey(sessionDateKey: string) {
  const session = await getSessionRecordByDateKey(sessionDateKey)
  if (!session) {
    return null
  }

  return getSessionSummaryDetail(session.id)
}

export async function listSessionDateKeys() {
  const sessions = await db.workoutSessions.orderBy('sessionDateKey').toArray()
  return sessions.map((session) => session.sessionDateKey)
}

export async function getSessionTemplateSyncStatus(
  sessionId: string,
): Promise<TemplateSyncStatus> {
  const session = await getSessionRecord(sessionId)
  const templateId = session?.autoImportedTemplateId ?? null
  if (!session || !templateId) {
    return { hasUpdates: false, templateName: null }
  }

  const template = await db.workoutTemplates.get(templateId)
  if (!template) {
    return { hasUpdates: false, templateName: null }
  }

  const lastSyncedAt = session.lastSyncedTemplateUpdatedAt ?? session.autoImportedAt ?? session.createdAt

  return {
    hasUpdates: template.updatedAt > lastSyncedAt,
    templateName: template.name,
  }
}

export async function syncSessionFromTemplate(sessionId: string): Promise<TemplateSyncResult> {
  const session = await getSessionRecord(sessionId)
  const templateId = session?.autoImportedTemplateId ?? null
  if (!session || session.sessionDateKey !== getTodaySessionDateKey() || !templateId) {
    throw new Error('只能同步今天自动安排的模板。')
  }

  const [template, templateExercises, visibleExercises] = await Promise.all([
    db.workoutTemplates.get(templateId),
    db.templateExercises.where('templateId').equals(templateId).toArray(),
    getSessionExercises(sessionId),
  ])

  if (!template) {
    throw new Error('模板不存在。')
  }

  await replaceVisibleSessionPlanFromTemplate(session, templateId)

  return {
    addedCount: templateExercises.length,
    updatedCount: 0,
    removedCount: visibleExercises.length,
  }
}
export async function addTemplateExercisesToSession(
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

  const existingExercises = await getSessionExercises(sessionId)
  const nextOrder = existingExercises.reduce((maxOrder, exercise) => Math.max(maxOrder, exercise.order), -1) + 1
  const templateExercises = await buildSessionExercisesFromTemplate(
    sessionId,
    templateId,
    nextOrder,
    templateExerciseIds,
  )

  if (templateExercises.length === 0) {
    return []
  }

  await db.sessionExercises.bulkAdd(templateExercises)

  return templateExercises
}

export async function addTemporarySessionExercise(sessionId: string, input: Partial<SessionExerciseInput>) {
  const session = await getSessionRecord(sessionId)
  if (!session) {
    throw new Error('当前训练不存在。')
  }

  const normalized = normalizeSessionExercise(input)
  const exercises = await getSessionExercises(sessionId)
  const nextOrder = exercises.reduce((maxOrder, exercise) => Math.max(maxOrder, exercise.order), -1) + 1

  const sessionExercise: SessionExercise = {
    id: crypto.randomUUID(),
    sessionId,
    templateExerciseId: null,
    sourceTemplateId: null,
    sourceTemplateSnapshot: null,
    origin: 'manual',
    removedFromTemplate: false,
    archivedAt: null,
    name: normalized.name,
    targetSets: normalized.targetSets,
    defaultWeightKg: normalized.defaultWeightKg,
    defaultReps: normalized.defaultReps,
    completedSets: 0,
    restSeconds: normalized.restSeconds,
    order: nextOrder,
    lastCompletedAt: null,
    restEndsAt: null,
  }

  await db.sessionExercises.add(sessionExercise)

  return sessionExercise
}

export async function deletePendingSessionExercise(sessionId: string, sessionExerciseId: string) {
  const [session, sessionExercise] = await Promise.all([
    getSessionRecord(sessionId),
    db.sessionExercises.get(sessionExerciseId),
  ])

  if (!session || !sessionExercise || sessionExercise.sessionId !== sessionId) {
    throw new Error('当前动作不存在。')
  }

  if (deriveExerciseStatus(sessionExercise) !== 'pending') {
    throw new Error('只能删除未开始的动作。')
  }

  await db.transaction('rw', db.workoutSessions, db.sessionExercises, async () => {
    if (sessionExercise.templateExerciseId) {
      const deletedTemplateExerciseIds = Array.from(
        new Set([...(session.deletedTemplateExerciseIds ?? []), sessionExercise.templateExerciseId]),
      )
      await db.workoutSessions.update(session.id, { deletedTemplateExerciseIds })
    }

    await db.sessionExercises.delete(sessionExerciseId)
  })
}

export async function reorderSessionExercises(sessionId: string, orderedExerciseIds: string[]) {
  const exercises = await getSessionExercises(sessionId)
  if (exercises.length !== orderedExerciseIds.length) {
    return
  }

  const exerciseIdSet = new Set(exercises.map((exercise) => exercise.id))
  if (orderedExerciseIds.some((exerciseId) => !exerciseIdSet.has(exerciseId))) {
    return
  }

  await db.transaction('rw', db.sessionExercises, async () => {
    await Promise.all(
      orderedExerciseIds.map((exerciseId, order) =>
        db.sessionExercises.update(exerciseId, { order }),
      ),
    )
  })
}

export async function completeSessionExerciseSet(sessionExerciseId: string): Promise<SetRecord> {
  const completedAt = nowIso()
  let createdSetRecord: SetRecord | null = null

  await db.transaction(
    'rw',
    db.sessionExercises,
    db.setRecords,
    db.templateExercises,
    async () => {
      const exercise = await db.sessionExercises.get(sessionExerciseId)
      if (!exercise) {
        throw new Error('当前动作不存在。')
      }

      if (exercise.completedSets >= exercise.targetSets) {
        throw new Error('当前动作已完成，不能继续记录新的一组。')
      }

      const templateExercise = exercise.templateExerciseId
        ? await db.templateExercises.get(exercise.templateExerciseId)
        : null
      const nextCompletedSets = exercise.completedSets + 1
      const restEndsAt = getRestEndsAt(completedAt, exercise.restSeconds)

      const setRecord: SetRecord = {
        id: crypto.randomUUID(),
        sessionId: exercise.sessionId,
        sessionExerciseId: exercise.id,
        setNumber: nextCompletedSets,
        completedAt,
        weightKg: exercise.defaultWeightKg ?? templateExercise?.weightKg ?? null,
        reps: exercise.defaultReps ?? templateExercise?.reps ?? null,
      }

      createdSetRecord = setRecord

      await db.setRecords.add(setRecord)
      await db.sessionExercises.update(exercise.id, {
        completedSets: nextCompletedSets,
        lastCompletedAt: completedAt,
        restEndsAt,
      })
    },
  )

  if (!createdSetRecord) {
    throw new Error('组记录创建失败。')
  }

  return createdSetRecord
}

export async function undoLatestSessionExerciseSet(sessionExerciseId: string): Promise<SetRecord> {
  let deletedSetRecord: SetRecord | null = null

  await db.transaction(
    'rw',
    db.sessionExercises,
    db.setRecords,
    async () => {
      const exercise = await db.sessionExercises.get(sessionExerciseId)
      if (!exercise) {
        throw new Error('当前动作不存在。')
      }

      const latestSetRecord = await getLatestSetRecord(sessionExerciseId)
      if (!latestSetRecord) {
        throw new Error('当前动作还没有已完成的组。')
      }

      const previousSetRecords = (
        await db.setRecords.where('sessionExerciseId').equals(sessionExerciseId).toArray()
      )
        .filter((record) => record.id !== latestSetRecord.id)
        .sort((left, right) => right.setNumber - left.setNumber)
      const previousLatestSetRecord = previousSetRecords[0] ?? null
      const completedSets = previousSetRecords.length
      const lastCompletedAt = previousLatestSetRecord?.completedAt ?? null
      const restEndsAt =
        previousLatestSetRecord && completedSets < exercise.targetSets
          ? getRestEndsAt(previousLatestSetRecord.completedAt, exercise.restSeconds)
          : null

      await db.setRecords.delete(latestSetRecord.id)
      await db.sessionExercises.update(exercise.id, {
        completedSets,
        lastCompletedAt,
        restEndsAt,
      })

      deletedSetRecord = latestSetRecord
    },
  )

  if (!deletedSetRecord) {
    throw new Error('最近一组撤销失败。')
  }

  return deletedSetRecord
}

export async function skipSessionExerciseRest(sessionExerciseId: string) {
  const exercise = await db.sessionExercises.get(sessionExerciseId)
  if (!exercise) {
    throw new Error('当前动作不存在。')
  }

  await db.sessionExercises.update(exercise.id, {
    restEndsAt: null,
  })
}

export async function updateLatestSetRecordValues(
  sessionExerciseId: string,
  input: {
    weightKg?: number | null
    reps?: number | null
  },
) {
  const latestSetRecord = await getLatestSetRecord(sessionExerciseId)
  if (!latestSetRecord) {
    throw new Error('当前动作还没有组记录，无法补录。')
  }

  const updates: Partial<SetRecord> = {}

  if (Object.prototype.hasOwnProperty.call(input, 'weightKg')) {
    updates.weightKg = input.weightKg ?? null
  }

  if (Object.prototype.hasOwnProperty.call(input, 'reps')) {
    updates.reps = input.reps ?? null
  }

  await db.setRecords.update(latestSetRecord.id, updates)

  return {
    ...latestSetRecord,
    ...updates,
  } satisfies SetRecord
}
