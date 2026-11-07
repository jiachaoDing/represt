import { db } from '../db/app-db'
import { getExerciseProfileId } from '../db/exercise-records'
import { createPlanWithExercises, listPlansWithExercises, type PlanWithExercises } from '../db/plans'
import { getTrainingCycle, setTrainingCycleSlots } from '../db/training-cycle'
import type { MovementPattern } from '../domain/exercise-catalog'
import type { ExerciseProfile } from '../models/types'
import { resolveCatalogExerciseId } from './exercise-name'
import type {
  PlanTemplateExportOption,
  PlanTransferData,
  PlanTransferExerciseModel,
  PlanTransferPlan,
} from './plan-transfer-types'

const fallbackMovementPattern: MovementPattern = 'fullBody'

function toTransferPlan(plan: Awaited<ReturnType<typeof listPlansWithExercises>>[number]) {
  return {
    planName: plan.name,
    exercises: plan.exercises.map((exercise) => ({
      exerciseProfileId: exercise.exerciseProfileId ?? getExerciseProfileId(exercise),
      loadMode: exercise.loadMode,
      name: exercise.name,
      catalogExerciseId: exercise.catalogExerciseId ?? null,
      measurementType: exercise.measurementType ?? null,
      targetSets: exercise.targetSets,
      restSeconds: exercise.restSeconds,
      weightKg: exercise.weightKg ?? null,
      reps: exercise.reps ?? null,
      rightWeightKg: exercise.rightWeightKg ?? null,
      rightReps: exercise.rightReps ?? null,
      durationSeconds: exercise.durationSeconds ?? null,
      distanceMeters: exercise.distanceMeters ?? null,
    })),
  } satisfies PlanTransferPlan
}

async function buildExerciseModelExport(plans: PlanWithExercises[]) {
  const profiles = await db.exerciseProfiles.toArray()
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  const modelsByProfileId = new Map<string, PlanTransferExerciseModel>()

  for (const exercise of plans.flatMap((plan) => plan.exercises)) {
    const profileId = getExerciseProfileId(exercise)
    const profile = profilesById.get(profileId)

    if (profile && !profile.preferencesOnly) {
      modelsByProfileId.set(profileId, {
        ...profile,
        profileId,
        name: profile.name,
        catalogExerciseId: profile.catalogExerciseId ?? null,
        movementPattern: profile.movementPattern ?? fallbackMovementPattern,
        muscleDistribution: profile.muscleDistribution ?? [],
      })
      continue
    }

    if (!resolveCatalogExerciseId(exercise)) {
      modelsByProfileId.set(profileId, {
        profileId,
        measurementType: exercise.measurementType,
        name: exercise.name,
        catalogExerciseId: null,
        movementPattern: fallbackMovementPattern,
        muscleDistribution: [],
      })
    }
  }

  return Array.from(modelsByProfileId.values())
}

export async function listPlanTemplateExportOptions() {
  const plans = await listPlansWithExercises()

  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    exerciseCount: plan.exercises.length,
  })) satisfies PlanTemplateExportOption[]
}

export async function buildPlanTemplateExport(planIds: string[]) {
  const plans = await listPlansWithExercises()
  const planIdSet = new Set(planIds)
  const selectedPlans = plans.filter((plan) => planIdSet.has(plan.id))
  if (selectedPlans.length === 0) {
    return null
  }

  return {
    formatVersion: 2,
    plans: selectedPlans.map(toTransferPlan),
    cycle: [],
    exerciseModels: await buildExerciseModelExport(selectedPlans),
  } satisfies PlanTransferData
}

export async function buildTrainingCycleExport() {
  const [plans, cycle] = await Promise.all([listPlansWithExercises(), getTrainingCycle()])
  const planById = new Map(plans.map((plan) => [plan.id, plan]))
  const exportedPlans: typeof plans = []
  const exportedPlanIndexById = new Map<string, number>()

  const cycleSlots =
    cycle?.slots.map((slot) => {
      if (!slot.planId) {
        return null
      }

      const plan = planById.get(slot.planId)
      if (!plan) {
        return null
      }

      const currentIndex = exportedPlanIndexById.get(plan.id)
      if (currentIndex !== undefined) {
        return currentIndex
      }

      const nextIndex = exportedPlans.length
      exportedPlans.push(plan)
      exportedPlanIndexById.set(plan.id, nextIndex)
      return nextIndex
    }) ?? []

  return {
    formatVersion: 2,
    plans: exportedPlans.map(toTransferPlan),
    cycle: cycleSlots,
    exerciseModels: await buildExerciseModelExport(exportedPlans),
  } satisfies PlanTransferData
}

async function prepareExerciseModels(models: PlanTransferExerciseModel[]) {
  const existing = await db.exerciseProfiles.toArray()
  const references = new Map<string, string>()
  const profiles: ExerciseProfile[] = []
  const timestamp = new Date().toISOString()
  for (const model of models) {
    const sourceId = model.profileId ?? getExerciseProfileId(model)
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(model)))
    const signature = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    const same = [...existing, ...profiles].find((profile) => profile.source === 'custom' && profile.importSignature === signature)
    if (same) { references.set(sourceId, same.id); continue }
    const id = !sourceId.startsWith('catalog:') && !existing.some((profile) => profile.id === sourceId)
      ? sourceId : `custom:${crypto.randomUUID()}`
    profiles.push({ ...model, id, catalogExerciseId: null, source: 'custom',
      copiedFromProfileId: model.copiedFromProfileId ?? (sourceId.startsWith('catalog:') ? sourceId : null),
      importSignature: signature, updatedAt: timestamp })
    references.set(sourceId, id)
  }
  return { profiles, references }
}

export async function importPlanTransferData(data: PlanTransferData) {
  const { profiles, references } = await prepareExerciseModels(data.exerciseModels)
  return db.transaction('rw', db.workoutPlans, db.planExercises, db.exerciseProfiles, db.trainingCycles, async () => {
    const createdPlans: PlanWithExercises[] = []
    await db.exerciseProfiles.bulkPut(profiles)
    for (const plan of data.plans) {
      const inputs = plan.exercises.map((exercise) => {
        const sourceId = exercise.exerciseProfileId ?? getExerciseProfileId(exercise)
        const profileId = references.get(sourceId) ?? exercise.exerciseProfileId
        return { ...exercise, exerciseProfileId: profileId,
          catalogExerciseId: profileId ? profileId.startsWith('catalog:') ? profileId.slice(8) : null : exercise.catalogExerciseId }
      })
      const createdPlan = await createPlanWithExercises(plan.planName, inputs)
      if (createdPlan) createdPlans.push(createdPlan)
    }
    if (data.cycle.length > 0) await setTrainingCycleSlots(data.cycle.map((index) => index === null ? null : createdPlans[index]?.id ?? null))
    return createdPlans
  })
}
