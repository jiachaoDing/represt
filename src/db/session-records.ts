import type { PerformedExercise, SessionPlanItem, SetRecord } from '../models/types'
import { getRestEndsAt } from '../lib/rest-timer'
import {
  buildSetRecordValuesForMeasurement,
  getMeasurementTypeForExercise,
} from '../lib/set-record-measurement'
import { db } from './app-db'
import { getLatestSetRecord, getPerformedExerciseForPlanItem, nowIso } from './session-core'

function createPerformedExercise(planItem: SessionPlanItem, timestamp: string) {
  return {
    id: crypto.randomUUID(),
    sessionId: planItem.sessionId,
    planItemId: planItem.id,
    templateExerciseId: planItem.templateExerciseId,
    sourceTemplateId: planItem.sourceTemplateId ?? null,
    sourceTemplateSnapshot: planItem.sourceTemplateSnapshot ?? null,
    origin: planItem.origin ?? 'manual',
    name: planItem.name,
    catalogExerciseId: planItem.catalogExerciseId ?? null,
    targetSets: planItem.targetSets,
    defaultWeightKg: planItem.defaultWeightKg ?? null,
    defaultReps: planItem.defaultReps ?? null,
    defaultDurationSeconds: planItem.defaultDurationSeconds ?? null,
    defaultDistanceMeters: planItem.defaultDistanceMeters ?? null,
    completedSets: 0,
    restSeconds: planItem.restSeconds,
    order: planItem.order,
    startedAt: timestamp,
    lastCompletedAt: null,
    restEndsAt: null,
  } satisfies PerformedExercise
}

async function getOrCreatePerformedExercise(planItem: SessionPlanItem, timestamp: string) {
  const current = await getPerformedExerciseForPlanItem(planItem.id)
  if (current) {
    return current
  }

  const nextExercise = createPerformedExercise(planItem, timestamp)
  await db.performedExercises.add(nextExercise)
  return nextExercise
}

export async function completePlanItemSet(planItemId: string): Promise<SetRecord> {
  const completedAt = nowIso()
  let createdSetRecord: SetRecord | null = null

  await db.transaction(
    'rw',
    db.sessionPlanItems,
    db.performedExercises,
    db.setRecords,
    db.templateExercises,
    async () => {
      const planItem = await db.sessionPlanItems.get(planItemId)
      if (!planItem) {
        throw new Error('当前动作不存在。')
      }

      const exercise = await getOrCreatePerformedExercise(planItem, completedAt)
      if (exercise.completedSets >= exercise.targetSets) {
        throw new Error('当前动作已完成，不能继续记录新的一组。')
      }

      const templateExercise = exercise.templateExerciseId
        ? await db.templateExercises.get(exercise.templateExerciseId)
        : null
      const nextCompletedSets = exercise.completedSets + 1
      const restEndsAt = getRestEndsAt(completedAt, exercise.restSeconds)
      const measurementType = getMeasurementTypeForExercise(exercise)
      const defaultValues = buildSetRecordValuesForMeasurement(measurementType, {
        weightKg: exercise.defaultWeightKg ?? templateExercise?.weightKg ?? null,
        reps: exercise.defaultReps ?? templateExercise?.reps ?? null,
        durationSeconds: exercise.defaultDurationSeconds ?? templateExercise?.durationSeconds ?? null,
        distanceMeters: exercise.defaultDistanceMeters ?? templateExercise?.distanceMeters ?? null,
      })

      const setRecord: SetRecord = {
        id: crypto.randomUUID(),
        sessionId: exercise.sessionId,
        performedExerciseId: exercise.id,
        setNumber: nextCompletedSets,
        completedAt,
        ...defaultValues,
      }

      createdSetRecord = setRecord

      await db.setRecords.add(setRecord)
      await db.performedExercises.update(exercise.id, {
        completedSets: nextCompletedSets,
        lastCompletedAt: completedAt,
        restEndsAt,
      })
    },
  )

  if (!createdSetRecord) {
    throw new Error('组记录创建失败。')
  }

  return createdSetRecord
}

export async function undoLatestPlanItemSet(planItemId: string): Promise<SetRecord> {
  let deletedSetRecord: SetRecord | null = null

  await db.transaction(
    'rw',
    db.performedExercises,
    db.setRecords,
    async () => {
      const exercise = await getPerformedExerciseForPlanItem(planItemId)
      if (!exercise) {
        throw new Error('当前动作还没有已完成的组。')
      }

      const latestSetRecord = await getLatestSetRecord(exercise.id)
      if (!latestSetRecord) {
        throw new Error('当前动作还没有已完成的组。')
      }

      const previousSetRecords = (
        await db.setRecords.where('performedExerciseId').equals(exercise.id).toArray()
      )
        .filter((record) => record.id !== latestSetRecord.id)
        .sort((left, right) => right.setNumber - left.setNumber)
      const previousLatestSetRecord = previousSetRecords[0] ?? null
      const completedSets = previousSetRecords.length
      const lastCompletedAt = previousLatestSetRecord?.completedAt ?? null
      const restEndsAt =
        previousLatestSetRecord && completedSets < exercise.targetSets
          ? getRestEndsAt(previousLatestSetRecord.completedAt, exercise.restSeconds)
          : null

      await db.setRecords.delete(latestSetRecord.id)
      await db.performedExercises.update(exercise.id, {
        completedSets,
        lastCompletedAt,
        restEndsAt,
      })

      deletedSetRecord = latestSetRecord
    },
  )

  if (!deletedSetRecord) {
    throw new Error('最近一组撤销失败。')
  }

  return deletedSetRecord
}

export async function skipPlanItemRest(planItemId: string) {
  const exercise = await getPerformedExerciseForPlanItem(planItemId)
  if (!exercise) {
    throw new Error('当前动作不存在。')
  }

  await db.performedExercises.update(exercise.id, {
    restEndsAt: null,
  })
}

export async function updateLatestSetRecordValues(
  planItemId: string,
  input: {
    weightKg?: number | null
    reps?: number | null
    durationSeconds?: number | null
    distanceMeters?: number | null
  },
) {
  const exercise = await getPerformedExerciseForPlanItem(planItemId)
  if (!exercise) {
    throw new Error('当前动作还没有组记录，无法补录。')
  }

  const latestSetRecord = await getLatestSetRecord(exercise.id)
  if (!latestSetRecord) {
    throw new Error('当前动作还没有组记录，无法补录。')
  }

  const measurementType = getMeasurementTypeForExercise(exercise)
  const updates: Partial<SetRecord> = buildSetRecordValuesForMeasurement(measurementType, input)

  await db.setRecords.update(latestSetRecord.id, updates)

  return {
    ...latestSetRecord,
    ...updates,
  } satisfies SetRecord
}
