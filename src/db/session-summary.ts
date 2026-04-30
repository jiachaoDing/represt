import type { WorkoutSession } from '../models/types'
import { deriveExerciseStatus } from '../lib/session-display'
import { db } from './app-db'
import {
  attachDerivedSessionStatus,
  getPerformedExercises,
  getSessionRecord,
  getSessionRecordByDateKey,
  getSessionSetRecords,
} from './session-core'
import type { SessionSummaryDetail } from './session-types'

function getSummaryExerciseMergeKey(exercise: {
  catalogExerciseId?: string | null
  id: string
  name: string
}) {
  const catalogExerciseId = exercise.catalogExerciseId?.trim()
  if (catalogExerciseId) {
    return `catalog:${catalogExerciseId}`
  }

  const normalizedName = exercise.name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
  return normalizedName ? `name:${normalizedName}` : `exercise:${exercise.id}`
}

export async function getSessionSummaryDetail(sessionId: string) {
  const [session, exercises, setRecords] = await Promise.all([
    getSessionRecord(sessionId),
    getPerformedExercises(sessionId),
    getSessionSetRecords(sessionId),
  ])

  if (!session) {
    return null
  }

  const setRecordsByExerciseId = new Map<string, typeof setRecords>()

  for (const setRecord of setRecords) {
    const current = setRecordsByExerciseId.get(setRecord.performedExerciseId) ?? []
    current.push(setRecord)
    setRecordsByExerciseId.set(setRecord.performedExerciseId, current)
  }

  const summaryExercises = exercises
    .map((exercise) => ({
      ...exercise,
      status: deriveExerciseStatus(exercise),
      setRecords: setRecordsByExerciseId.get(exercise.id) ?? [],
    }))
    .filter((exercise) => exercise.setRecords.length > 0)
  const summaryExerciseGroups = summaryExercises.reduce((groups, exercise) => {
    const mergeKey = getSummaryExerciseMergeKey(exercise)
    const current = groups.get(mergeKey)

    if (!current) {
      groups.set(mergeKey, { ...exercise, setRecords: [...exercise.setRecords] })
      return groups
    }

    const setRecords = [...current.setRecords, ...exercise.setRecords].sort((left, right) =>
      left.completedAt.localeCompare(right.completedAt),
    )

    groups.set(mergeKey, {
      ...current,
      completedSets: current.completedSets + exercise.completedSets,
      lastCompletedAt:
        current.lastCompletedAt && exercise.lastCompletedAt
          ? current.lastCompletedAt > exercise.lastCompletedAt
            ? current.lastCompletedAt
            : exercise.lastCompletedAt
          : current.lastCompletedAt ?? exercise.lastCompletedAt,
      targetSets: current.targetSets + exercise.targetSets,
      setRecords,
      status: deriveExerciseStatus({
        completedSets: current.completedSets + exercise.completedSets,
        targetSets: current.targetSets + exercise.targetSets,
        restEndsAt: null,
      }),
    })

    return groups
  }, new Map<string, typeof summaryExercises[number]>())
  const mergedSummaryExercises = Array.from(summaryExerciseGroups.values()).sort(
    (left, right) => left.order - right.order,
  )

  return {
    session: attachDerivedSessionStatus(session, exercises),
    exercises: mergedSummaryExercises,
  } satisfies SessionSummaryDetail
}

export async function getSessionSummaryDetailByDateKey(sessionDateKey: string) {
  const session = await getSessionRecordByDateKey(sessionDateKey)
  if (!session) {
    return null
  }

  const detail = await getSessionSummaryDetail(session.id)
  return detail && detail.exercises.length > 0 ? detail : null
}

export async function listSessionDateKeys() {
  const setRecords = await db.setRecords.orderBy('completedAt').toArray()
  const sessionIds = Array.from(new Set(setRecords.map((record) => record.sessionId)))
  const sessions = (await db.workoutSessions.bulkGet(sessionIds)).filter(
    (session): session is WorkoutSession => session !== undefined,
  )

  return Array.from(new Set(sessions.map((session) => session.sessionDateKey))).sort()
}
