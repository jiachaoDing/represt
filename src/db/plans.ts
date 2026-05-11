import type {
  SessionPlanItem,
  PlanExercise,
  WorkoutPlan,
} from '../models/types'
import type { MeasurementType } from '../domain/exercise-catalog'
import { resolveCatalogExerciseId } from '../lib/exercise-name'
import { buildSetRecordValuesForMeasurement, getMeasurementTypeForExercise } from '../lib/set-record-measurement'
import { db } from './app-db'
import { clearPlanFromTrainingCycle } from './training-cycle'

export type PlanWithExercises = WorkoutPlan & {
  exercises: PlanExercise[]
}

export type PlanExerciseInput = {
  name: string
  catalogExerciseId?: string | null
  measurementType?: MeasurementType | null
  targetSets: number
  restSeconds: number
  weightKg?: number | null
  reps?: number | null
  durationSeconds?: number | null
  distanceMeters?: number | null
}

type SessionPlanPlanSource = Pick<
  SessionPlanItem,
  | 'name'
  | 'catalogExerciseId'
  | 'measurementType'
  | 'targetSets'
  | 'restSeconds'
  | 'defaultWeightKg'
  | 'defaultReps'
  | 'defaultDurationSeconds'
  | 'defaultDistanceMeters'
  | 'order'
>

let ensurePlanSeedPromise: Promise<void> | null = null

function nowIso() {
  return new Date().toISOString()
}

function normalizePlanName(name: string) {
  return name.trim() || '未命名计划'
}

function normalizeExercise(input: Partial<PlanExerciseInput>) {
  const name = input.name?.trim() || '未命名动作'
  const catalogExerciseId = resolveCatalogExerciseId({ name, catalogExerciseId: input.catalogExerciseId })
  const measurementType = getMeasurementTypeForExercise({
    catalogExerciseId,
    measurementType: input.measurementType ?? null,
    name,
  })
  const values = buildSetRecordValuesForMeasurement(measurementType, {
    distanceMeters: input.distanceMeters ?? null,
    durationSeconds: input.durationSeconds ?? null,
    reps: input.reps ?? null,
    weightKg: input.weightKg ?? null,
  })

  return {
    name,
    catalogExerciseId,
    measurementType,
    targetSets: Math.max(1, Math.floor(input.targetSets ?? 3)),
    restSeconds: Math.max(0, Math.floor(input.restSeconds ?? 90)),
    ...values,
  }
}

async function touchPlan(planId: string) {
  await db.workoutPlans.update(planId, { updatedAt: nowIso() })
}

function buildPlanExercisesFromSessionPlanItems(
  planId: string,
  planItems: SessionPlanPlanSource[],
) {
  return [...planItems]
    .sort((left, right) => left.order - right.order)
    .map((item, order) => ({
      id: crypto.randomUUID(),
      planId,
      name: item.name,
      catalogExerciseId: item.catalogExerciseId ?? null,
      measurementType: item.measurementType ?? null,
      targetSets: item.targetSets,
      restSeconds: item.restSeconds,
      weightKg: item.defaultWeightKg ?? null,
      reps: item.defaultReps ?? null,
      durationSeconds: item.defaultDurationSeconds ?? null,
      distanceMeters: item.defaultDistanceMeters ?? null,
      order,
    })) satisfies PlanExercise[]
}

export async function ensurePlanSeedData() {
  if (ensurePlanSeedPromise) {
    await ensurePlanSeedPromise
    return
  }

  ensurePlanSeedPromise = Promise.resolve()

  try {
    await ensurePlanSeedPromise
  } finally {
    ensurePlanSeedPromise = null
  }
}

export async function listPlansWithExercises() {
  const [plans, exercises] = await Promise.all([
    db.workoutPlans.toArray(),
    db.planExercises.toArray(),
  ])

  const exercisesByPlan = new Map<string, PlanExercise[]>()

  for (const exercise of exercises) {
    const current = exercisesByPlan.get(exercise.planId) ?? []
    current.push(exercise)
    exercisesByPlan.set(exercise.planId, current)
  }

  return plans
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((plan) => ({
      ...plan,
      exercises: (exercisesByPlan.get(plan.id) ?? []).sort((left, right) => left.order - right.order),
    }))
}

export async function createPlan(name: string) {
  const timestamp = nowIso()
  const plan: WorkoutPlan = {
    id: crypto.randomUUID(),
    name: normalizePlanName(name),
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.workoutPlans.add(plan)

  return plan
}

export async function createPlanFromSessionPlanItems(
  name: string,
  planItems: SessionPlanPlanSource[],
) {
  if (planItems.length === 0) {
    return null
  }

  const timestamp = nowIso()
  const plan: WorkoutPlan = {
    id: crypto.randomUUID(),
    name: normalizePlanName(name),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const exercises = buildPlanExercisesFromSessionPlanItems(plan.id, planItems)

  await db.transaction('rw', db.workoutPlans, db.planExercises, async () => {
    await db.workoutPlans.add(plan)
    await db.planExercises.bulkAdd(exercises)
  })

  return { ...plan, exercises } satisfies PlanWithExercises
}

export async function createPlanWithExercises(
  name: string,
  exerciseInputs: Partial<PlanExerciseInput>[],
) {
  if (exerciseInputs.length === 0) {
    return null
  }

  const timestamp = nowIso()
  const plan: WorkoutPlan = {
    id: crypto.randomUUID(),
    name: normalizePlanName(name),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const exercises = exerciseInputs.map((input, order) => ({
    id: crypto.randomUUID(),
    planId: plan.id,
    order,
    ...normalizeExercise(input),
  }))

  await db.transaction('rw', db.workoutPlans, db.planExercises, async () => {
    await db.workoutPlans.add(plan)
    await db.planExercises.bulkAdd(exercises)
  })

  return { ...plan, exercises } satisfies PlanWithExercises
}

export async function updatePlanName(planId: string, name: string) {
  await db.workoutPlans.update(planId, {
    name: normalizePlanName(name),
    updatedAt: nowIso(),
  })
}

export async function deletePlan(planId: string) {
  await db.transaction('rw', db.workoutPlans, db.planExercises, async () => {
    await db.planExercises.where('planId').equals(planId).delete()
    await db.workoutPlans.delete(planId)
  })

  await clearPlanFromTrainingCycle(planId)
}

export async function createPlanExercise(planId: string, input: Partial<PlanExerciseInput>) {
  const exercises = await createPlanExercises(planId, [input])

  return exercises[0]
}

export async function createPlanExercises(
  planId: string,
  inputs: Partial<PlanExerciseInput>[],
) {
  if (inputs.length === 0) {
    return []
  }

  const exercises = await db.planExercises.where('planId').equals(planId).toArray()
  const nextOrder = exercises.reduce((maxOrder, exercise) => Math.max(maxOrder, exercise.order), -1) + 1

  const nextExercises = inputs.map((input, index) => ({
    id: crypto.randomUUID(),
    planId,
    order: nextOrder + index,
    ...normalizeExercise(input),
  })) satisfies PlanExercise[]

  await db.planExercises.bulkAdd(nextExercises)
  await touchPlan(planId)

  return nextExercises
}

export async function importPlanExercises(targetPlanId: string, sourceExerciseIds: string[]) {
  if (sourceExerciseIds.length === 0) {
    return []
  }

  const sourceExercises = (await db.planExercises.bulkGet(sourceExerciseIds)).filter(
    (exercise): exercise is PlanExercise =>
      exercise !== undefined && exercise.planId !== targetPlanId,
  )

  if (sourceExercises.length === 0) {
    return []
  }

  const sourceExerciseMap = new Map(sourceExercises.map((exercise) => [exercise.id, exercise]))
  const orderedSourceExercises = sourceExerciseIds
    .map((exerciseId) => sourceExerciseMap.get(exerciseId) ?? null)
    .filter((exercise): exercise is PlanExercise => exercise !== null)
  const targetExercises = await db.planExercises.where('planId').equals(targetPlanId).toArray()
  const nextOrder = targetExercises.reduce((maxOrder, exercise) => Math.max(maxOrder, exercise.order), -1) + 1
  const importedExercises = orderedSourceExercises.map((exercise, index) => ({
    id: crypto.randomUUID(),
    planId: targetPlanId,
    name: exercise.name,
    catalogExerciseId: exercise.catalogExerciseId ?? null,
    measurementType: exercise.measurementType ?? null,
    targetSets: exercise.targetSets,
    restSeconds: exercise.restSeconds,
    weightKg: exercise.weightKg ?? null,
    reps: exercise.reps ?? null,
    durationSeconds: exercise.durationSeconds ?? null,
    distanceMeters: exercise.distanceMeters ?? null,
    order: nextOrder + index,
  }))

  await db.transaction('rw', db.planExercises, db.workoutPlans, async () => {
    await db.planExercises.bulkAdd(importedExercises)
    await touchPlan(targetPlanId)
  })

  return importedExercises
}

export async function replacePlanExercisesFromSessionPlanItems(
  planId: string,
  planItems: SessionPlanPlanSource[],
) {
  if (planItems.length === 0) {
    return null
  }

  const plan = await db.workoutPlans.get(planId)
  if (!plan) {
    return null
  }

  const updatedAt = nowIso()
  const exercises = buildPlanExercisesFromSessionPlanItems(planId, planItems)

  await db.transaction('rw', db.workoutPlans, db.planExercises, async () => {
    await db.planExercises.where('planId').equals(planId).delete()
    await db.planExercises.bulkAdd(exercises)
    await db.workoutPlans.update(planId, { updatedAt })
  })

  return { ...plan, updatedAt, exercises } satisfies PlanWithExercises
}

export async function updatePlanExercise(
  exerciseId: string,
  input: Partial<PlanExerciseInput>,
) {
  const current = await db.planExercises.get(exerciseId)
  if (!current) {
    return
  }

  await db.planExercises.update(exerciseId, normalizeExercise({ ...current, ...input }))
  await touchPlan(current.planId)
}

export async function deletePlanExercise(exerciseId: string) {
  const current = await db.planExercises.get(exerciseId)
  if (!current) {
    return
  }

  await db.planExercises.delete(exerciseId)
  await touchPlan(current.planId)
}

export async function reorderPlanExercises(planId: string, orderedExerciseIds: string[]) {
  const exercises = await db.planExercises.where('planId').equals(planId).sortBy('order')
  if (exercises.length !== orderedExerciseIds.length) {
    return
  }

  const exerciseIdSet = new Set(exercises.map((exercise) => exercise.id))
  if (orderedExerciseIds.some((exerciseId) => !exerciseIdSet.has(exerciseId))) {
    return
  }

  await db.transaction('rw', db.planExercises, db.workoutPlans, async () => {
    await Promise.all(
      orderedExerciseIds.map((exerciseId, order) =>
        db.planExercises.update(exerciseId, { order }),
      ),
    )
    await touchPlan(planId)
  })
}
