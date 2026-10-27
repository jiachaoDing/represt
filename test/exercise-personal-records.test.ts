import 'fake-indexeddb/auto'
import { beforeEach, expect, it, vi } from 'vitest'

import { db } from '../src/db/app-db'
import { getExercisePersonalRecords, getExerciseProfileId, listExerciseRecordSummaries } from '../src/db/exercise-records'
import { getScheduleExerciseDetail } from '../src/db/session-schedule'
import type { PerformedExercise, SetRecord } from '../src/models/types'

vi.mock('../src/i18n', () => ({ default: { t: (key: string) => key } }))

const timestamp = '2026-10-27T10:00:00.000Z'
const exercise = { id: 'today-item', catalogExerciseId: 'barbellBenchPress', name: 'Bench press', measurementType: 'weightReps' as const }

beforeEach(async () => {
  await db.open()
  for (const table of db.tables) await table.clear()
})

async function addRecord(id: string, values: Partial<SetRecord>, source: Partial<PerformedExercise> = {}) {
  const sessionId = source.sessionId ?? `session-${id}`
  if (!await db.workoutSessions.get(sessionId)) {
    const day = 20 + await db.workoutSessions.count()
    await db.workoutSessions.put({ id: sessionId, sessionDateKey: `2026-10-${day}`, createdAt: timestamp })
  }
  await db.performedExercises.put({
    ...exercise, id, sessionId, planItemId: null, planExerciseId: null,
    targetSets: 3, completedSets: 1, restSeconds: 90, order: 0,
    startedAt: timestamp, lastCompletedAt: timestamp, restEndsAt: null, ...source,
  })
  await db.setRecords.put({
    id: `set-${id}`, sessionId, performedExerciseId: id, setNumber: 1,
    completedAt: timestamp, weightKg: null, reps: null, durationSeconds: null, distanceMeters: null, ...values,
  })
}

it('matches the record page across sessions, catalog names and legacy name-only records', async () => {
  await addRecord('heavy', { weightKg: 100, reps: 3 }, { name: '杠铃卧推' })
  await addRecord('reps', { weightKg: 60, reps: 15 }, { catalogExerciseId: null, name: '杠铃卧推' })
  await addRecord('unrelated', { weightKg: 200, reps: 30 }, { catalogExerciseId: 'squat', name: '深蹲' })
  await addRecord('orphan', { weightKg: 300, reps: 40 })
  await db.workoutSessions.delete('session-orphan')

  const result = await getExercisePersonalRecords(exercise)
  expect(result).toEqual({ weightKg: 100, reps: 15 })
  const summary = (await listExerciseRecordSummaries()).find((item) => item.profileId === getExerciseProfileId(exercise))!
  expect(summary.primaryMetric?.value).toBe(result.weightKg)
  expect(summary.secondaryMetrics.find((metric) => metric.kind === 'maxReps')?.value).toBe(result.reps)
})

it('normalizes custom exercise names and respects the measurement type', async () => {
  const custom = { ...exercise, catalogExerciseId: null, name: '  Custom   Press  ' }
  await addRecord('custom', { weightKg: 0, reps: 12 }, { catalogExerciseId: null, name: 'custom press' })
  expect(await getExercisePersonalRecords(custom)).toEqual({ weightKg: 0, reps: 12 })
  expect(await getExercisePersonalRecords({ ...custom, measurementType: 'reps' })).toEqual({ weightKg: null, reps: null })
  expect(await getExercisePersonalRecords({ ...custom, measurementType: 'weightDistance' })).toEqual({ weightKg: null, reps: null })
  expect(await getExercisePersonalRecords({ ...custom, measurementType: 'duration' })).toEqual({ weightKg: null, reps: null })
  expect(await getExercisePersonalRecords({ ...custom, name: 'Untrained exercise' })).toEqual({ weightKg: null, reps: null })
})

it('compares bilateral weight totals and mean reps against ordinary weight/reps records', async () => {
  await addRecord('ordinary', { measurementType: 'weightReps', weightKg: 50, reps: 13 })
  await addRecord('bilateral', {
    measurementType: 'leftRightWeightReps', weightKg: 40, rightWeightKg: 20, reps: 10, rightReps: 14,
    completedAt: '2026-10-27T11:00:00Z',
  }, { measurementType: 'leftRightWeightReps' })
  await addRecord('reps-only', { measurementType: 'reps', reps: 100 }, { measurementType: 'reps' })
  expect(await getExercisePersonalRecords(exercise)).toEqual({ weightKg: 60, weightSides: [40, 20], reps: 13 })
  expect(await getExercisePersonalRecords({ ...exercise, measurementType: 'leftRightWeightReps' })).toEqual({ weightKg: 60, weightSides: [40, 20], reps: 13 })
  expect(await getExercisePersonalRecords({ ...exercise, measurementType: 'reps' })).toEqual({ weightKg: null, reps: 100 })
  await db.setRecords.update('set-ordinary', { reps: 11 })
  expect(await getExercisePersonalRecords(exercise)).toEqual({ weightKg: 60, weightSides: [40, 20], reps: 12, repsSides: [10, 14] })
})

it('refreshes the exercise page PR after records are added, corrected or undone', async () => {
  await db.workoutSessions.put({ id: 'today', sessionDateKey: '2026-10-27', createdAt: timestamp })
  await db.sessionPlanItems.put({
    ...exercise, sessionId: 'today', planExerciseId: null,
    targetSets: 3, defaultWeightKg: 150, defaultReps: 20, restSeconds: 90, order: 0, createdAt: timestamp,
  })
  const readRecords = async () => (await getScheduleExerciseDetail(exercise.id))?.personalRecords
  expect(await readRecords()).toEqual({ weightKg: null, reps: null })
  await addRecord('history', { weightKg: 60, reps: 8 })
  await addRecord('current', { weightKg: 80, reps: 10 }, { planItemId: exercise.id, sessionId: 'today' })
  expect(await readRecords()).toEqual({ weightKg: 80, reps: 10 })
  await db.setRecords.update('set-current', { weightKg: 50, reps: 6 })
  expect(await readRecords()).toEqual({ weightKg: 60, reps: 8 })
  await db.setRecords.delete('set-history')
  expect(await readRecords()).toEqual({ weightKg: 50, reps: 6 })
  await db.setRecords.delete('set-current')
  expect(await readRecords()).toEqual({ weightKg: null, reps: null })
})
