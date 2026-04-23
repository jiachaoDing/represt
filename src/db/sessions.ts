import type { SessionExercise, WorkoutSession } from '../models/types'
import { db } from './app-db'
import { ensureTemplateSeedData } from './templates'

export type WorkoutSessionWithExercises = WorkoutSession & {
  exercises: SessionExercise[]
}

export type SessionExerciseDetail = {
  session: WorkoutSession
  exercise: SessionExercise
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

async function resolveCurrentSessionId() {
  const storedSessionId = getStoredCurrentSessionId()
  if (storedSessionId) {
    const storedSession = await db.workoutSessions.get(storedSessionId)
    if (storedSession) {
      return storedSession.id
    }

    setStoredCurrentSessionId(null)
  }

  const latestSession = await db.workoutSessions.orderBy('createdAt').last()
  if (!latestSession) {
    return null
  }

  setStoredCurrentSessionId(latestSession.id)
  return latestSession.id
}

async function getSessionRecord(sessionId: string) {
  return db.workoutSessions.get(sessionId)
}

async function getSessionExercises(sessionId: string) {
  const exercises = await db.sessionExercises.where('sessionId').equals(sessionId).toArray()
  return exercises.sort((left, right) => left.order - right.order)
}

async function removeSessionGraph(sessionId: string) {
  await db.setRecords.where('sessionId').equals(sessionId).delete()
  await db.sessionExercises.where('sessionId').equals(sessionId).delete()
  await db.workoutSessions.delete(sessionId)
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
    ...session,
    exercises,
  } satisfies WorkoutSessionWithExercises
}

export async function getSessionExerciseDetail(sessionExerciseId: string) {
  const exercise = await db.sessionExercises.get(sessionExerciseId)
  if (!exercise) {
    return null
  }

  const session = await getSessionRecord(exercise.sessionId)
  if (!session) {
    return null
  }

  return {
    session,
    exercise,
  } satisfies SessionExerciseDetail
}

export async function createOrRebuildCurrentSession(templateId: string) {
  await ensureTemplateSeedData()

  const currentSessionId = await resolveCurrentSessionId()
  const currentSession = currentSessionId ? await getSessionRecord(currentSessionId) : null
  if (currentSession && currentSession.status !== 'pending') {
    throw new Error('当前训练已开始，不能切换模板。')
  }

  const template = await db.workoutTemplates.get(templateId)
  if (!template || template.deletedAt !== null) {
    throw new Error('模板不存在或已删除。')
  }

  const templateExercises = await db.templateExercises.where('templateId').equals(templateId).toArray()
  const sortedTemplateExercises = templateExercises.sort((left, right) => left.order - right.order)
  const timestamp = nowIso()
  const sessionId = crypto.randomUUID()

  const session: WorkoutSession = {
    id: sessionId,
    templateId: template.id,
    templateName: template.name,
    status: 'pending',
    startedAt: null,
    endedAt: null,
    createdAt: timestamp,
  }

  const sessionExercises: SessionExercise[] = sortedTemplateExercises.map((exercise) => ({
    id: crypto.randomUUID(),
    sessionId,
    templateExerciseId: exercise.id,
    name: exercise.name,
    targetSets: exercise.targetSets,
    completedSets: 0,
    restSeconds: exercise.restSeconds,
    order: exercise.order,
    lastCompletedAt: null,
    status: 'pending',
  }))

  await db.transaction(
    'rw',
    db.workoutSessions,
    db.sessionExercises,
    db.setRecords,
    async () => {
      if (currentSession) {
        await removeSessionGraph(currentSession.id)
      }

      await db.workoutSessions.add(session)
      if (sessionExercises.length > 0) {
        await db.sessionExercises.bulkAdd(sessionExercises)
      }
    },
  )

  setStoredCurrentSessionId(session.id)

  return {
    ...session,
    exercises: sessionExercises,
  } satisfies WorkoutSessionWithExercises
}

export async function addTemporarySessionExercise(sessionId: string, input: Partial<SessionExerciseInput>) {
  const session = await getSessionRecord(sessionId)
  if (!session) {
    throw new Error('当前训练不存在。')
  }

  if (session.status === 'completed') {
    throw new Error('已完成的训练不能再新增动作。')
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
    status: 'pending',
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

  if (session.status !== 'pending') {
    throw new Error('训练已开始后不能删除动作。')
  }

  if (sessionExercise.status !== 'pending' || sessionExercise.completedSets > 0) {
    throw new Error('只能删除未开始的动作。')
  }

  await db.sessionExercises.delete(sessionExerciseId)
}

export async function startSession(sessionId: string) {
  const session = await getSessionRecord(sessionId)
  if (!session) {
    throw new Error('当前训练不存在。')
  }

  if (session.status !== 'pending') {
    return session
  }

  const startedAt = nowIso()
  await db.workoutSessions.update(sessionId, {
    status: 'active',
    startedAt,
  })

  return {
    ...session,
    status: 'active',
    startedAt,
  } satisfies WorkoutSession
}
