import type { PerformedExercise, SessionStatus, WorkoutSession } from '../models/types'
import { deriveExerciseStatus } from '../lib/session-display'
import { db } from './app-db'
import type { WorkoutSessionWithStatus } from './session-types'

export function nowIso() {
  return new Date().toISOString()
}

export async function getSessionRecord(sessionId: string) {
  return db.workoutSessions.get(sessionId)
}

export async function getSessionRecordByDateKey(sessionDateKey: string) {
  return db.workoutSessions.where('sessionDateKey').equals(sessionDateKey).first()
}

export async function getSessionPlanItems(sessionId: string) {
  const planItems = await db.sessionPlanItems.where('sessionId').equals(sessionId).toArray()
  return planItems.sort((left, right) => left.order - right.order)
}

export async function getPerformedExercises(sessionId: string) {
  const exercises = await db.performedExercises.where('sessionId').equals(sessionId).toArray()
  return exercises.sort((left, right) => left.order - right.order)
}

export async function getSessionSetRecords(sessionId: string) {
  const setRecords = await db.setRecords.where('sessionId').equals(sessionId).toArray()
  return setRecords.sort((left, right) => left.setNumber - right.setNumber)
}

export async function getPerformedExerciseForPlanItem(planItemId: string) {
  return db.performedExercises.where('planItemId').equals(planItemId).first()
}

export async function getLatestSetRecord(performedExerciseId: string) {
  const records = await db.setRecords.where('performedExerciseId').equals(performedExerciseId).toArray()

  if (records.length === 0) {
    return null
  }

  return records.sort((left, right) => right.setNumber - left.setNumber)[0]
}

function deriveSessionStatus(
  exercises: Array<Pick<PerformedExercise, 'completedSets' | 'targetSets' | 'restEndsAt'>>,
) {
  if (exercises.length === 0) {
    return 'pending' satisfies SessionStatus
  }

  if (exercises.every((exercise) => deriveExerciseStatus(exercise) === 'completed')) {
    return 'completed' satisfies SessionStatus
  }

  return 'active' satisfies SessionStatus
}

export function attachDerivedSessionStatus(
  session: WorkoutSession,
  exercises: Array<Pick<PerformedExercise, 'completedSets' | 'targetSets' | 'restEndsAt'>>,
) {
  return {
    ...session,
    status: deriveSessionStatus(exercises),
  } satisfies WorkoutSessionWithStatus
}
