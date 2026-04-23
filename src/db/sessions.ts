import type { SessionExercise, SessionStatus, SetRecord, WorkoutSession } from '../models/types'
import { getTodaySessionDateKey } from '../lib/session-date-key'
import { getRestEndsAt } from '../lib/rest-timer'
import { deriveExerciseStatus, type DerivedExerciseStatus } from '../lib/session-display'
import { db } from './app-db'
import { ensureTemplateSeedData } from './templates'

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

type SessionExerciseInput = {
  name: string
  targetSets?: number
  restSeconds?: number
}

const CURRENT_SESSION_KEY = 'trainre.current-session-id.v1'

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
  }
}

function deriveSessionStatus(exercises: Array<Pick<SessionExercise, 'completedSets' | 'targetSets'>>) {
  if (exercises.length === 0) {
    return 'pending' satisfies SessionStatus
  }

  if (exercises.every((exercise) => exercise.completedSets >= exercise.targetSets)) {
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
  exercises: Array<Pick<SessionExercise, 'completedSets' | 'targetSets'>>,
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

async function getSessionExercises(sessionId: string) {
  const exercises = await db.sessionExercises.where('sessionId').equals(sessionId).toArray()
  return exercises.sort((left, right) => left.order - right.order)
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
  }

  await db.workoutSessions.add(session)
  setStoredCurrentSessionId(session.id)

  return session
}

async function buildSessionExercisesFromTemplate(sessionId: string, templateId: string, startOrder = 0) {
  const templateExercises = await db.templateExercises.where('templateId').equals(templateId).toArray()
  const sortedTemplateExercises = templateExercises.sort((left, right) => left.order - right.order)

  return sortedTemplateExercises.map((exercise, index) => ({
    id: crypto.randomUUID(),
    sessionId,
    templateExerciseId: exercise.id,
    name: exercise.name,
    targetSets: exercise.targetSets,
    completedSets: 0,
    restSeconds: exercise.restSeconds,
    order: startOrder + index,
    lastCompletedAt: null,
    restEndsAt: null,
  })) satisfies SessionExercise[]
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

  const exercises = await getSessionExercises(session.id)
  return {
    ...attachDerivedSessionStatus(session, exercises),
    exercises: exercises.map(attachDerivedExerciseStatus),
  } satisfies WorkoutSessionWithExercises
}

export async function getOrCreateTodaySession() {
  const currentSession = await getCurrentSession()
  if (currentSession) {
    return currentSession
  }

  const session = await createSessionRecord()
  return {
    ...attachDerivedSessionStatus(session, []),
    exercises: [],
  } satisfies WorkoutSessionWithExercises
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
    getSessionExercises(sessionId),
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
    exercises: exercises.map((exercise) => ({
      ...attachDerivedExerciseStatus(exercise),
      setRecords: setRecordsByExerciseId.get(exercise.id) ?? [],
    })),
  } satisfies SessionSummaryDetail
}

export async function addTemplateExercisesToSession(sessionId: string, templateId: string) {
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
  const templateExercises = await buildSessionExercisesFromTemplate(sessionId, templateId, nextOrder)

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
    name: normalized.name,
    targetSets: normalized.targetSets,
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

  await db.sessionExercises.delete(sessionExerciseId)
}

export async function completeSessionExerciseSet(sessionExerciseId: string): Promise<SetRecord> {
  const completedAt = nowIso()
  let createdSetRecord: SetRecord | null = null

  await db.transaction(
    'rw',
    db.sessionExercises,
    db.setRecords,
    async () => {
      const exercise = await db.sessionExercises.get(sessionExerciseId)
      if (!exercise) {
        throw new Error('当前动作不存在。')
      }

      if (deriveExerciseStatus(exercise) === 'completed') {
        throw new Error('当前动作已完成，不能继续记录新的一组。')
      }

      const nextCompletedSets = exercise.completedSets + 1
      const restEndsAt =
        nextCompletedSets >= exercise.targetSets ? null : getRestEndsAt(completedAt, exercise.restSeconds)

      const setRecord: SetRecord = {
        id: crypto.randomUUID(),
        sessionId: exercise.sessionId,
        sessionExerciseId: exercise.id,
        setNumber: nextCompletedSets,
        completedAt,
        weightKg: null,
        reps: null,
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
