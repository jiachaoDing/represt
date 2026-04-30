import type { WorkoutSession } from '../models/types'
import { getTodaySessionDateKey } from '../lib/session-date-key'
import { db } from './app-db'
import { ensureTemplateSeedData } from './templates'
import { attachDerivedSessionStatus, getPerformedExercises, getSessionRecord, nowIso } from './session-core'
import { maybeAutoImportTrainingCycleTemplate } from './session-plan'
import { getScheduleExercises } from './session-schedule'
import type { WorkoutSessionWithExercises } from './session-types'

export type {
  ScheduleExercise,
  ScheduleExerciseDetail,
  SessionSummaryDetail,
  TemplateSyncResult,
  TemplateSyncStatus,
  WorkoutSessionWithExercises,
} from './session-types'

export {
  addTemplateExercisesToSessionPlan,
  addTemporarySessionPlanItem,
  deletePendingSessionPlanItem,
  getSessionTemplateSyncStatus,
  reorderSessionPlanItems,
  syncSessionPlanFromTemplate,
} from './session-plan'
export {
  completePlanItemSet,
  skipPlanItemRest,
  undoLatestPlanItemSet,
  updateLatestSetRecordValues,
} from './session-records'
export { getScheduleExerciseDetail } from './session-schedule'
export {
  getSessionSummaryDetail,
  getSessionSummaryDetailByDateKey,
  listSessionDateKeys,
} from './session-summary'

const CURRENT_SESSION_KEY = 'trainre.current-session-id.v1'
let getOrCreateTodaySessionPromise: Promise<WorkoutSessionWithExercises> | null = null

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

  const session = await db.workoutSessions.where('sessionDateKey').equals(todayDateKey).first()
  if (!session) {
    return null
  }

  setStoredCurrentSessionId(session.id)
  return session.id
}

async function createSessionRecord() {
  const timestamp = nowIso()
  const session: WorkoutSession = {
    id: crypto.randomUUID(),
    sessionDateKey: getTodaySessionDateKey(),
    createdAt: timestamp,
    plannedTemplateId: null,
    plannedTemplateNameSnapshot: null,
    plannedTemplateSelectedAt: null,
    lastSyncedTemplateUpdatedAt: null,
  }

  await db.workoutSessions.add(session)
  setStoredCurrentSessionId(session.id)

  return session
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
  const [exercises, performedExercises] = await Promise.all([
    getScheduleExercises(hydratedSession.id),
    getPerformedExercises(hydratedSession.id),
  ])

  return {
    ...attachDerivedSessionStatus(hydratedSession, performedExercises),
    exercises,
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
    const hydratedSession = await maybeAutoImportTrainingCycleTemplate(session)
    const exercises = await getScheduleExercises(hydratedSession.id)

    return {
      ...attachDerivedSessionStatus(hydratedSession, []),
      exercises,
    } satisfies WorkoutSessionWithExercises
  })()

  try {
    return await getOrCreateTodaySessionPromise
  } finally {
    getOrCreateTodaySessionPromise = null
  }
}
