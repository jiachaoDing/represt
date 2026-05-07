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
      name: exercise.name,
      catalogExerciseId: exercise.catalogExerciseId ?? null,
      targetSets: exercise.targetSets,
      restSeconds: exercise.restSeconds,
      weightKg: exercise.weightKg ?? null,
      reps: exercise.reps ?? null,
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

    if (profile && !profile.deletedAt) {
      modelsByProfileId.set(profileId, {
        name: profile.name,
        catalogExerciseId: profile.catalogExerciseId ?? null,
        movementPattern: profile.movementPattern ?? fallbackMovementPattern,
        muscleDistribution: profile.muscleDistribution ?? [],
      })
      continue
    }

    if (!resolveCatalogExerciseId(exercise)) {
      modelsByProfileId.set(profileId, {
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
    plans: exportedPlans.map(toTransferPlan),
    cycle: cycleSlots,
    exerciseModels: await buildExerciseModelExport(exportedPlans),
  } satisfies PlanTransferData
}

async function importExerciseModels(models: PlanTransferExerciseModel[]) {
  if (models.length === 0) {
    return
  }

  const timestamp = new Date().toISOString()
  const profiles = models.map((model) => {
    const catalogExerciseId = resolveCatalogExerciseId(model)
    const profileId = getExerciseProfileId({
      catalogExerciseId,
      name: model.name,
    })

    return {
      catalogExerciseId,
      id: profileId,
      muscleDistribution: model.muscleDistribution,
      movementPattern: model.movementPattern,
      name: model.name,
      source: catalogExerciseId ? undefined : 'custom',
      updatedAt: timestamp,
    } satisfies ExerciseProfile
  })

  await db.exerciseProfiles.bulkPut(profiles)
}

export async function importPlanTransferData(data: PlanTransferData) {
  const createdPlans: PlanWithExercises[] = []

  await importExerciseModels(data.exerciseModels)

  for (const plan of data.plans) {
    const createdPlan = await createPlanWithExercises(plan.planName, plan.exercises)
    if (createdPlan) {
      createdPlans.push(createdPlan)
    }
  }

  if (data.cycle.length > 0) {
    await setTrainingCycleSlots(data.cycle.map((planIndex) => (planIndex === null ? null : createdPlans[planIndex]?.id ?? null)))
  }

  return createdPlans
}
