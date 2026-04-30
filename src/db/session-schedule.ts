import type { PerformedExercise, SessionPlanItem } from '../models/types'
import { deriveExerciseStatus } from '../lib/session-display'
import { db } from './app-db'
import {
  attachDerivedSessionStatus,
  getLatestSetRecord,
  getPerformedExerciseForPlanItem,
  getPerformedExercises,
  getSessionPlanItems,
  getSessionRecord,
} from './session-core'
import type { ScheduleExercise, ScheduleExerciseDetail } from './session-types'

export function toScheduleExercise(
  planItem: SessionPlanItem,
  performedExercise: PerformedExercise | null,
) {
  const exercise = {
    ...planItem,
    completedSets: performedExercise?.completedSets ?? 0,
    lastCompletedAt: performedExercise?.lastCompletedAt ?? null,
    performedExerciseId: performedExercise?.id ?? null,
    restEndsAt: performedExercise?.restEndsAt ?? null,
  }

  return {
    ...exercise,
    status: deriveExerciseStatus(exercise),
  } satisfies ScheduleExercise
}

export async function getScheduleExercises(sessionId: string) {
  const [planItems, performedExercises] = await Promise.all([
    getSessionPlanItems(sessionId),
    getPerformedExercises(sessionId),
  ])
  const performedByPlanItemId = new Map(
    performedExercises
      .filter((exercise) => exercise.planItemId !== null)
      .map((exercise) => [exercise.planItemId, exercise]),
  )

  return planItems.map((planItem) =>
    toScheduleExercise(planItem, performedByPlanItemId.get(planItem.id) ?? null),
  )
}

export async function getScheduleExerciseDetail(planItemId: string) {
  const planItem = await db.sessionPlanItems.get(planItemId)
  if (!planItem) {
    return null
  }

  const [session, performedExercise] = await Promise.all([
    getSessionRecord(planItem.sessionId),
    getPerformedExerciseForPlanItem(planItem.id),
  ])

  if (!session) {
    return null
  }

  const latestSetRecord = performedExercise ? await getLatestSetRecord(performedExercise.id) : null
  const exercise = toScheduleExercise(planItem, performedExercise ?? null)

  return {
    session: attachDerivedSessionStatus(session, performedExercise ? [performedExercise] : []),
    exercise,
    latestSetRecord,
  } satisfies ScheduleExerciseDetail
}
