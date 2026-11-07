import 'fake-indexeddb/auto'
import { beforeEach, expect, it, vi } from 'vitest'
import { db } from '../src/db/app-db'
import { getScheduleExerciseDetail } from '../src/db/session-schedule'
import { completePlanItemSet, decreaseSessionPlanItemTargetSets, increaseSessionPlanItemTargetSets,
  undoLatestPlanItemSet, updateLatestSetRecordValues } from '../src/db/session-records'
import type { SessionPlanItem } from '../src/models/types'

vi.mock('../src/i18n', () => ({ default: { t: (key: string) => key } }))
vi.mock('../src/lib/session-date-key', () => ({ getTodaySessionDateKey: () => '2026-11-03' }))

async function createItem(day: number, overrides: Partial<SessionPlanItem> = {}) {
  const date = `2026-11-${String(day).padStart(2, '0')}`
  const item: SessionPlanItem = {
    id: `item-${day}`, sessionId: `session-${day}`, planExerciseId: 'plan-exercise',
    catalogExerciseId: 'barbellBenchPress', name: 'Bench press', measurementType: 'weightReps',
    targetSets: 3, defaultWeightKg: 60, defaultReps: 10, restSeconds: 90, order: 0,
    createdAt: `${date}T10:00:00Z`, ...overrides,
  }
  await db.workoutSessions.put({ id: item.sessionId, sessionDateKey: date, createdAt: item.createdAt })
  await db.sessionPlanItems.put(item)
  return item
}

async function train(item: SessionPlanItem, reps: number[], weightKg = 60) {
  for (const value of reps) {
    await completePlanItemSet(item.id)
    await updateLatestSetRecordValues(item.id, { weightKg, reps: value })
  }
}

beforeEach(async () => {
  await db.open()
  for (const table of db.tables) await table.clear()
})

it('uses legacy actual history by stable catalog ID and freezes all current targets across refresh and undo', async () => {
  const old = await createItem(1)
  await train(old, [10, 9, 8])
  // Simulate an older backup with no guidance or explicit set metadata.
  await db.sessionPlanItems.update(old.id, { trainingGuidance: undefined })
  const originalRecords = await db.setRecords.toArray()
  const current = await createItem(3, { name: '已改名', planExerciseId: 'another-plan-entry' })
  expect((await getScheduleExerciseDetail(current.id))?.trainingTarget).toEqual({ weightKg: 60, reps: 11 })
  const first = await completePlanItemSet(current.id)
  expect(first).toMatchObject({ weightKg: 60, reps: 11, setNumber: 1 })
  await updateLatestSetRecordValues(current.id, { weightKg: 60, reps: 5 })
  const next = await getScheduleExerciseDetail(current.id)
  expect(next?.trainingTarget).toEqual({ weightKg: 60, reps: 10 })
  expect(next?.exercise).toMatchObject({ completedSets: 1, targetSets: 3 })
  expect(next?.exercise.restEndsAt).not.toBeNull()
  await undoLatestPlanItemSet(current.id)
  expect((await getScheduleExerciseDetail(current.id))?.trainingTarget).toEqual({ weightKg: 60, reps: 11 })
  expect(await db.setRecords.toArray()).toEqual(originalRecords)
})

it.each([
  { catalogExerciseId: 'barbellBenchPress', weightKg: 60, nextWeightKg: 65 },
  { catalogExerciseId: 'dumbbellBenchPress', weightKg: 20, nextWeightKg: 22.5 },
])('uses the equipment increment for $catalogExerciseId and retains PR/history values', async ({ catalogExerciseId, weightKg, nextWeightKg }) => {
  const overrides = { catalogExerciseId, defaultWeightKg: weightKg }
  await train(await createItem(1, overrides), [12, 12, 12], weightKg)
  const records = await db.setRecords.toArray()
  const current = await createItem(3, overrides)
  const detail = await getScheduleExerciseDetail(current.id)
  expect(detail?.trainingTarget).toEqual({ weightKg: nextWeightKg, reps: 8 })
  expect(detail?.personalRecords).toMatchObject({ weightKg, reps: 12 })
  expect(await completePlanItemSet(current.id)).toMatchObject({ weightKg: nextWeightKg, reps: 8 })
  expect(await db.setRecords.where('sessionId').equals(records[0].sessionId).toArray()).toEqual(records)
})

it('prefills the previous-set record with the just-completed recommendation while advancing guidance to the next set', async () => {
  await train(await createItem(1), [10, 9, 8])
  const current = await createItem(3)
  const recommendedReps = [11, 10, 9]
  for (let index = 0; index < recommendedReps.length; index++) {
    const before = await getScheduleExerciseDetail(current.id)
    expect(before?.trainingTarget).toEqual({ weightKg: 60, reps: recommendedReps[index] })
    await completePlanItemSet(current.id)
    const after = await getScheduleExerciseDetail(current.id)
    expect(after?.latestSetRecord).toMatchObject({
      setNumber: index + 1,
      weightKg: before!.trainingTarget!.weightKg,
      reps: before!.trainingTarget!.reps,
    })
    if (index < recommendedReps.length - 1) {
      expect(after?.trainingTarget?.reps).toBe(recommendedReps[index + 1])
    }
  }
  await updateLatestSetRecordValues(current.id, { weightKg: 55, reps: 6 })
  const refreshed = await getScheduleExerciseDetail(current.id)
  expect(refreshed?.latestSetRecord).toMatchObject({ setNumber: 3, weightKg: 55, reps: 6 })
  expect(refreshed?.previousSetRecord).toMatchObject({ setNumber: 2, weightKg: 60, reps: 10 })
})

it('preserves a manually entered working load for remaining sets without replacing their rep targets', async () => {
  await train(await createItem(1), [10, 9, 8])
  const current = await createItem(3)
  await completePlanItemSet(current.id)
  await updateLatestSetRecordValues(current.id, { weightKg: 55, reps: 7 })
  expect((await getScheduleExerciseDetail(current.id))?.trainingTarget).toEqual({ weightKg: 55, reps: 10 })
  expect(await completePlanItemSet(current.id)).toMatchObject({ weightKg: 55, reps: 10 })
  expect((await db.setRecords.orderBy('completedAt').toArray()).find((record) => record.sessionId === current.sessionId)?.weightKg).toBe(55)
})

it('blocks a load increase after interruption, explicit skip, missing values or a recording-mode change', async () => {
  const old = await createItem(1)
  await train(old, [12, 12])
  const current = await createItem(2)
  expect((await getScheduleExerciseDetail(current.id))?.trainingTarget?.weightKg).toBe(60)
  const third = await completePlanItemSet(old.id)
  await db.setRecords.update(third.id, { reps: 12, status: 'skipped' })
  const next = await createItem(3)
  expect((await getScheduleExerciseDetail(next.id))?.trainingTarget?.weightKg).toBe(60)
  await db.sessionPlanItems.update(next.id, { trainingGuidance: undefined })
  await db.setRecords.update(third.id, { status: 'completed', measurementType: 'duration' })
  expect((await getScheduleExerciseDetail(next.id))?.trainingTarget?.weightKg).toBe(60)
})

it('does not match different variants/equipment or unrelated custom movement names', async () => {
  await train(await createItem(1), [12, 12, 12])
  const dumbbell = await createItem(2, { catalogExerciseId: 'dumbbellBenchPress', defaultWeightKg: 20 })
  expect((await getScheduleExerciseDetail(dumbbell.id))?.trainingTarget).toEqual({ weightKg: 20, reps: 10 })
  const custom = await createItem(3, { catalogExerciseId: null, planExerciseId: 'custom-id' })
  expect((await getScheduleExerciseDetail(custom.id))?.trainingTarget).toEqual({ weightKg: 60, reps: 10 })
})

it('matches custom exercises by stable plan entry ID despite a name change', async () => {
  await train(await createItem(1, { catalogExerciseId: null }), [10, 9, 8])
  const current = await createItem(3, { catalogExerciseId: null, name: 'Renamed custom movement' })
  expect((await getScheduleExerciseDetail(current.id))?.trainingTarget).toEqual({ weightKg: 60, reps: 11 })
})

it('only deloads after two complete workouts at the same load', async () => {
  await train(await createItem(1), [6, 7, 8])
  const second = await createItem(2)
  expect((await getScheduleExerciseDetail(second.id))?.trainingTarget?.weightKg).toBe(60)
  await train(second, [7, 6, 8])
  expect((await getScheduleExerciseDetail((await createItem(3)).id))?.trainingTarget).toEqual({ weightKg: 55, reps: 8 })
})

it('holds bodyweight at the rep ceiling and leaves timed exercises on their existing path', async () => {
  const old = await createItem(1, { catalogExerciseId: 'pullUp', measurementType: 'reps', defaultWeightKg: null })
  await train(old, [12, 12, 12], 0)
  const bodyweight = await createItem(2, { catalogExerciseId: 'pullUp', measurementType: 'reps', defaultWeightKg: null })
  expect((await getScheduleExerciseDetail(bodyweight.id))?.trainingTarget).toEqual({ weightKg: null, reps: 12 })
  const timed = await createItem(3, { measurementType: 'duration', defaultDurationSeconds: 45 })
  expect((await getScheduleExerciseDetail(timed.id))?.trainingTarget).toBeNull()
  expect(await completePlanItemSet(timed.id)).toMatchObject({ reps: null, weightKg: null, durationSeconds: 45 })
})

it('keeps existing targets when adding sets and cannot earn a bump by removing unfinished sets', async () => {
  const current = await createItem(3)
  await getScheduleExerciseDetail(current.id)
  await increaseSessionPlanItemTargetSets(current.id)
  const snapshot = (await db.sessionPlanItems.get(current.id))!.trainingGuidance!
  await getScheduleExerciseDetail(current.id)
  const extended = (await db.sessionPlanItems.get(current.id))!.trainingGuidance!
  expect(extended.targets.slice(0, 3)).toEqual(snapshot.targets)
  expect(extended.targets[3]).toEqual({ weightKg: 60, reps: 8 })
  await decreaseSessionPlanItemTargetSets(current.id)
  await train(current, [12, 12, 12])
  const next = await createItem(4)
  expect((await getScheduleExerciseDetail(next.id))?.trainingTarget?.weightKg).toBe(60)
})

it('retains the actual current load when resuming a legacy workout without a guidance snapshot', async () => {
  const current = await createItem(3)
  await completePlanItemSet(current.id)
  await updateLatestSetRecordValues(current.id, { weightKg: 47.5, reps: 7 })
  await db.sessionPlanItems.update(current.id, { trainingGuidance: undefined })
  expect((await getScheduleExerciseDetail(current.id))?.trainingTarget?.weightKg).toBe(47.5)
  expect(await completePlanItemSet(current.id)).toMatchObject({ weightKg: 47.5 })
})

it('excludes explicitly marked warmups and uses working-set ordinals', async () => {
  const old = await createItem(1)
  await train(old, [12, 12, 12])
  const records = await db.setRecords.where('sessionId').equals(old.sessionId).sortBy('setNumber')
  for (const record of records) await db.setRecords.update(record.id, { setNumber: record.setNumber + 1 })
  await db.setRecords.add({ ...records[0], id: 'warmup', setNumber: 1, kind: 'warmup', weightKg: 20, reps: 5 })
  expect((await getScheduleExerciseDetail((await createItem(3)).id))?.trainingTarget).toEqual({ weightKg: 65, reps: 8 })
})

it.each([15, 20])('adds 2.5 kg to each dumbbell together after both sides qualify (right starts at %i kg)', async (rightWeightKg) => {
  const overrides = { measurementType: 'leftRightWeightReps' as const, catalogExerciseId: 'dumbbellBenchPress',
    defaultWeightKg: 20, defaultRightWeightKg: rightWeightKg, defaultReps: 10, defaultRightReps: 9 }
  const old = await createItem(1, overrides)
  for (let index = 0; index < 3; index++) {
    await completePlanItemSet(old.id)
    await updateLatestSetRecordValues(old.id, { weightKg: 20, rightWeightKg, reps: 12, rightReps: 10 - index })
  }
  const current = await createItem(2, overrides)
  expect((await getScheduleExerciseDetail(current.id))?.trainingTarget).toEqual({ weightKg: 20, reps: 12, rightWeightKg, rightReps: 11 })
  for (let index = 0; index < 3; index++) {
    await completePlanItemSet(current.id)
    await updateLatestSetRecordValues(current.id, { weightKg: 20, rightWeightKg, reps: 12, rightReps: 12 })
  }
  const next = await createItem(3, overrides)
  const expectedTarget = { weightKg: 22.5, reps: 8, rightWeightKg: rightWeightKg + 2.5, rightReps: 8 }
  expect((await getScheduleExerciseDetail(next.id))?.trainingTarget).toEqual(expectedTarget)
  expect(await completePlanItemSet(next.id)).toMatchObject(expectedTarget)
})

it('treats two occurrences in a single session as one workout for the deload rule', async () => {
  const old = await createItem(1)
  await train(old, [6, 6, 6])
  const copy = { ...old, id: 'second-occurrence' }
  await db.sessionPlanItems.put(copy)
  await train(copy, [6, 6, 6])
  expect((await getScheduleExerciseDetail((await createItem(3)).id))?.trainingTarget?.weightKg).toBe(60)
})

it('falls back to existing plan values when an old session has no default snapshot', async () => {
  await db.planExercises.put({ id: 'plan-exercise', planId: 'plan', name: 'Bench press',
    weightKg: 40, reps: 15, targetSets: 3, restSeconds: 90, order: 0 })
  const current = await createItem(3, { defaultWeightKg: undefined, defaultReps: undefined })
  expect((await getScheduleExerciseDetail(current.id))?.trainingTarget).toEqual({ weightKg: 40, reps: 15 })
  expect(await completePlanItemSet(current.id)).toMatchObject({ weightKg: 40, reps: 15 })
})

it('progresses timed-repetition counts while preserving the duration recording path', async () => {
  const overrides = { measurementType: 'durationReps' as const, defaultDurationSeconds: 30 }
  const old = await createItem(1, overrides)
  await train(old, [10, 9, 8])
  const current = await createItem(3, overrides)
  expect((await getScheduleExerciseDetail(current.id))?.trainingTarget).toEqual({ weightKg: null, reps: 11 })
  expect(await completePlanItemSet(current.id)).toMatchObject({ weightKg: null, reps: 11, durationSeconds: 30 })
})
