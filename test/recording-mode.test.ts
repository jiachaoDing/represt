import 'fake-indexeddb/auto'
import { beforeEach, expect, it, vi } from 'vitest'
import i18next from 'i18next'
import Dexie from 'dexie'

import { db } from '../src/db/app-db'
import { completePlanItemSet, updateLatestSetRecordValues, updatePlanItemRecordingMode } from '../src/db/session-records'
import { getExerciseRecordDetail, getExerciseProfileId } from '../src/db/exercise-records'
import { draftToSessionPlanInput } from '../src/hooks/pages/schedule-page-data.utils'
import { toPlanExerciseDraft } from '../src/lib/plan-editor'
import { createPlanWithExercises, listPlansWithExercises } from '../src/db/plans'
import { buildPlanTemplateExport, importPlanTransferData } from '../src/lib/plan-transfer-data'
import { parsePlanTransferJson } from '../src/lib/plan-transfer-parser'
import { formatSetRecordValue, getNextRecordingMode, getRecordSummaryParts, getSetRecordStatistics, recordingModeCycle } from '../src/lib/set-record-measurement'
import zh from '../src/locales/zh-CN/common'

vi.mock('../src/i18n', () => ({ default: { t: (key: string) => key } }))

const timestamp = '2026-10-27T10:00:00.000Z'
const item = {
  id: 'item', sessionId: 'session', planExerciseId: null, name: 'Custom movement',
  measurementType: 'weightReps' as const, targetSets: 8, restSeconds: 0, order: 0,
  defaultWeightKg: 20, defaultReps: 10, defaultDurationSeconds: 30, createdAt: timestamp,
  defaultRightWeightKg: 15, defaultRightReps: 12,
}

beforeEach(async () => {
  await db.open()
  for (const table of db.tables) await table.clear()
  await db.workoutSessions.put({ id: 'session', sessionDateKey: '2026-10-27', createdAt: timestamp })
  await db.sessionPlanItems.put(item)
})

it('cycles through the five modes and retains the selected type in the session draft', () => {
  let mode = recordingModeCycle[0]
  const visited = [mode]
  for (let index = 1; index < 5; index++) {
    mode = getNextRecordingMode(mode)
    visited.push(mode)
  }
  expect(visited).toEqual(['weightReps', 'leftRightWeightReps', 'reps', 'durationReps', 'duration'])
  expect(getNextRecordingMode(mode)).toBe('weightReps')
  expect(draftToSessionPlanInput(toPlanExerciseDraft({ ...item, measurementType: 'durationReps' })).measurementType).toBe('durationReps')
})

it('changes only future sets, including legacy records restored without a type snapshot', async () => {
  const first = await completePlanItemSet(item.id)
  await db.setRecords.update(first.id, { measurementType: undefined })
  await updatePlanItemRecordingMode(item.id, 'durationReps')
  const unchanged = await db.setRecords.get(first.id)
  expect(unchanged).toMatchObject({ measurementType: 'weightReps', weightKg: 20, reps: 10, durationSeconds: null })
  await updateLatestSetRecordValues(item.id, { weightKg: 25, reps: 8, durationSeconds: 99 })
  expect(await db.setRecords.get(first.id)).toMatchObject({ measurementType: 'weightReps', weightKg: 25, reps: 8, durationSeconds: null })
  const second = await completePlanItemSet(item.id)
  expect(second).toMatchObject({ measurementType: 'durationReps', weightKg: null, reps: 10, durationSeconds: 30 })
  expect(await db.setRecords.get(first.id)).toMatchObject({ weightKg: 25, reps: 8, durationSeconds: null })
  expect(await db.sessionPlanItems.get(item.id)).toMatchObject({ measurementType: 'durationReps' })
})

it('records both sides independently and includes both sides in totals and history', async () => {
  await updatePlanItemRecordingMode(item.id, 'leftRightWeightReps')
  const record = await completePlanItemSet(item.id)
  expect(record).toMatchObject({ weightKg: 20, reps: 10, rightWeightKg: 15, rightReps: 12 })
  const edited = await updateLatestSetRecordValues(item.id, { weightKg: 20, reps: 8, rightWeightKg: 15, rightReps: 10 })
  expect(getSetRecordStatistics(edited, 'duration')).toMatchObject({ highestWeight: 35, maxReps: 9, totalReps: 18, weightRepsVolume: 310 })
  const detail = await getExerciseRecordDetail(getExerciseProfileId(item))
  expect(detail).toMatchObject({ completedSets: 1, totalReps: 18, totalVolume: 310 })
  expect(detail?.history[0].setRecord).toMatchObject({ measurementType: 'leftRightWeightReps', rightWeightKg: 15, rightReps: 10 })
  await updatePlanItemRecordingMode(item.id, 'reps')
  const next = await completePlanItemSet(item.id)
  expect(next).toMatchObject({ measurementType: 'reps', weightKg: null, reps: 10 })
  expect(next.rightWeightKg).toBeUndefined()
  expect((await db.setRecords.get(record.id))?.rightWeightKg).toBe(15)
})

it('saves an explicitly changed supplement type without changing earlier sets', async () => {
  const first = await completePlanItemSet(item.id)
  const latest = await completePlanItemSet(item.id)
  // A draft mode does not change persisted records or the future mode until Save.
  expect(await db.setRecords.get(latest.id)).toMatchObject({ measurementType: 'weightReps', weightKg: 20, reps: 10 })
  await updateLatestSetRecordValues(item.id, {
    measurementType: 'leftRightWeightReps', weightKg: 22, reps: 8, rightWeightKg: 18, rightReps: 9,
  })
  expect(await db.setRecords.get(latest.id)).toMatchObject({ measurementType: 'leftRightWeightReps', weightKg: 22, rightWeightKg: 18, rightReps: 9 })
  expect(await db.sessionPlanItems.get(item.id)).toMatchObject({ measurementType: 'leftRightWeightReps' })
  expect(await db.setRecords.get(first.id)).toEqual(first)
  await updateLatestSetRecordValues(item.id, { measurementType: 'durationReps', durationSeconds: 45, reps: 12 })
  expect(await db.setRecords.get(latest.id)).toMatchObject({ measurementType: 'durationReps', weightKg: null, rightWeightKg: null, rightReps: null, reps: 12, durationSeconds: 45 })
})

it('rolls back the record and future mode together when saving fails', async () => {
  const record = await completePlanItemSet(item.id)
  const failSave = vi.spyOn(db.setRecords, 'update').mockRejectedValueOnce(new Error('Save failed'))
  try {
    await expect(updateLatestSetRecordValues(item.id, { measurementType: 'duration', durationSeconds: 60 })).rejects.toThrow('Save failed')
    expect(await db.setRecords.get(record.id)).toEqual(record)
    expect(await db.sessionPlanItems.get(item.id)).toMatchObject({ measurementType: 'weightReps' })
    expect(await db.performedExercises.get(record.performedExerciseId)).toMatchObject({ measurementType: 'weightReps' })
  } finally {
    failSave.mockRestore()
  }
})

it('keeps both side defaults and the recording mode when plans are saved, exported and imported', async () => {
  const exercise = { name: item.name, measurementType: 'leftRightWeightReps' as const,
    targetSets: 4, restSeconds: 90, weightKg: 20, reps: 10, rightWeightKg: 15, rightReps: 12 }
  const plan = await createPlanWithExercises('Plan', [exercise])
  const exported = await buildPlanTemplateExport([plan!.id])
  const parsed = parsePlanTransferJson(JSON.stringify(exported), 'Imported')
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) throw new Error('Expected a valid plan export')
  await importPlanTransferData(parsed.data)
  const plans = await listPlansWithExercises()
  expect(plans).toHaveLength(2)
  for (const saved of plans) expect(saved.exercises[0]).toMatchObject(exercise)
  const input = draftToSessionPlanInput(toPlanExerciseDraft(exercise))
  expect(input).toMatchObject({ measurementType: 'leftRightWeightReps', defaultRightWeightKg: 15, defaultRightReps: 12 })
})

it('formats mixed records using each set snapshot and summarizes all recorded values', async () => {
  const translator = i18next.createInstance()
  await translator.init({ lng: 'zh-CN', interpolation: { escapeValue: false }, resources: { 'zh-CN': { translation: zh } } })
  const weighted = await completePlanItemSet(item.id)
  const bilateralLabel = formatSetRecordValue({
    ...weighted, measurementType: 'leftRightWeightReps', weightKg: 40, rightWeightKg: 20, reps: 10, rightReps: 14,
  }, 'weightReps', translator.t)
  expect(bilateralLabel).toContain('40/20')
  expect(bilateralLabel).toContain('10/14')
  await updatePlanItemRecordingMode(item.id, 'durationReps')
  const timedReps = await completePlanItemSet(item.id)
  await updatePlanItemRecordingMode(item.id, 'duration')
  const timed = await completePlanItemSet(item.id)
  expect(formatSetRecordValue(weighted, 'duration', translator.t)).toContain('20')
  expect(formatSetRecordValue(timedReps, 'weightReps', translator.t)).toContain('30')
  expect(formatSetRecordValue(timedReps, 'weightReps', translator.t)).toContain('10')
  expect(formatSetRecordValue(timed, 'weightReps', translator.t)).toContain('30')
  const parts = getRecordSummaryParts([weighted, timedReps, timed], 'duration', translator.t).join(' · ')
  expect(parts).toContain(translator.t('summary.totalReps', { reps: 20 }))
  expect(parts).toContain(translator.t('summary.totalDuration', { duration: translator.t('common.minutes', { value: 1 }) }))
})

it('migrates existing set records with their historical measurement type', async () => {
  db.close()
  await db.delete()
  const legacy = new Dexie('trainre')
  legacy.version(20).stores({
    trainingCycles: 'id, updatedAt', workoutPlans: 'id, name, updatedAt',
    planExercises: 'id, planId, [planId+order]', workoutSessions: 'id, &sessionDateKey, createdAt',
    sessionPlanItems: 'id, sessionId, planExerciseId, sourcePlanId, [sessionId+order]',
    performedExercises: 'id, sessionId, planItemId, restEndsAt, [sessionId+order]',
    setRecords: 'id, sessionId, performedExerciseId, [performedExerciseId+setNumber], completedAt',
    exerciseProfiles: 'id, catalogExerciseId, name, updatedAt',
    sharedPlanRecords: 'code, createdAt, expiresAt', accountSync: 'id',
  })
  await legacy.open()
  await legacy.table('performedExercises').put({ id: 'legacy-exercise', name: 'Plank', measurementType: 'duration' })
  const record = { id: 'legacy-set', sessionId: 'session', performedExerciseId: 'legacy-exercise',
    setNumber: 1, completedAt: timestamp, weightKg: null, reps: null, durationSeconds: 45, distanceMeters: null }
  await legacy.table('setRecords').put(record)
  legacy.close()
  await db.open()
  expect(await db.setRecords.get(record.id)).toEqual({ ...record, measurementType: 'duration' })
  expect(db.verno).toBe(21)
})
