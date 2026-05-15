import type { WorkoutSession } from '../models/types'
import { getTodaySessionDateKey } from '../lib/session-date-key'
import { db } from './app-db'
import { attachDerivedSessionStatus, getPerformedExercises, getSessionRecord, nowIso } from './session-core'
import { maybeAutoImportTrainingCyclePlan } from './session-plan'
import { getScheduleExercises } from './session-schedule'
import type { WorkoutSessionWithExercises } from './session-types'

export type {
  ScheduleExercise,
  ScheduleExerciseDetail,
  SessionSummaryDetail,
  PlanSyncResult,
  PlanSyncStatus,
  WorkoutSessionWithExercises,
} from './session-types'

export {
  addPlanExercisesToSessionPlan,
  addTemporarySessionPlanItem,
  addTemporarySessionPlanItems,
  deletePendingSessionPlanItem,
  getSessionPlanSyncStatus,
  markSessionPlanSynced,
  replaceSessionPlanItem,
  reorderSessionPlanItems,
  syncSessionPlanFromPlan,
} from './session-plan'
export {
  completePlanItemSet,
  decreaseSessionPlanItemTargetSets,
  increaseSessionPlanItemTargetSets,
  skipPlanItemRest,
  undoPlanItemExercise,
  undoLatestPlanItemSet,
  updateLatestSetRecordValues,
} from './session-records'
export { getScheduleExerciseDetail } from './session-schedule'
export {
  getSessionSummaryDetail,
  getSessionSummaryDetailByDateKey,
  listSessionDateKeys,
} from './session-summary'
export {
  createCustomExerciseProfile,
  getExerciseModelForm,
  getEffectiveExerciseMuscleDistribution,
  getExerciseProfile,
  getExerciseProfileId,
  getExerciseRecordDetail,
  listExerciseModelOptions,
  listExerciseRecordSummaries,
  resetExerciseProfileMuscleDistribution,
  saveExerciseModel,
  saveExerciseProfileMuscleDistribution,
  softDeleteExerciseModel,
  type ExerciseModelForm,
  type ExerciseModelOption,
  type ExerciseRecordDetail,
  type ExerciseRecordMetric,
  type ExerciseRecordMetricKind,
  type ExerciseRecordSummary,
  type ExerciseRecordTrendPoint,
  type ExerciseRecordTrendKind,
  type ExerciseRecordTrendSeries,
  type CreateCustomExerciseProfileResult,
  type SaveExerciseModelResult,
} from './exercise-records'
export {
  getSummaryRangeAnalytics,
  getSummaryRangeBounds,
  type SummaryMetricKind,
  type SummaryRange,
  type SummaryRangeAnalytics,
  type SummaryRecordHighlight,
  type SummaryTrendPoint,
} from './summary-analytics'

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

export function clearStoredCurrentSessionId() {
  getOrCreateTodaySessionPromise = null
  setStoredCurrentSessionId(null)
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
    plannedPlanId: null,
    plannedPlanNameSnapshot: null,
    plannedPlanSelectedAt: null,
    lastSyncedPlanUpdatedAt: null,
  }

  await db.workoutSessions.add(session)
  setStoredCurrentSessionId(session.id)

  return session
}

export async function getCurrentSession() {
  const sessionId = await resolveCurrentSessionId()
  if (!sessionId) {
    return null
  }

  const session = await getSessionRecord(sessionId)
  if (!session) {
    setStoredCurrentSessionId(null)
    return null
  }

  const hydratedSession = await maybeAutoImportTrainingCyclePlan(session)
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
    const hydratedSession = await maybeAutoImportTrainingCyclePlan(session)
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
