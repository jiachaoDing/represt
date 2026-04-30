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

  return {
    session: attachDerivedSessionStatus(session, exercises),
    exercises: exercises
      .map((exercise) => ({
        ...exercise,
        status: deriveExerciseStatus(exercise),
        setRecords: setRecordsByExerciseId.get(exercise.id) ?? [],
      }))
      .filter((exercise) => exercise.setRecords.length > 0),
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
