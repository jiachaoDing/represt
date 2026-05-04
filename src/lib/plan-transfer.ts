import { createPlanWithExercises, listPlansWithExercises, type PlanWithExercises } from '../db/plans'
import { getTrainingCycle, setTrainingCycleSlots } from '../db/training-cycle'

export type PlanTransferExercise = {
  name: string
  catalogExerciseId?: string | null
  targetSets: number
  restSeconds: number
  weightKg: number | null
  reps: number | null
  durationSeconds: number | null
  distanceMeters: number | null
}

export type PlanTransferPlan = {
  planName: string
  exercises: PlanTransferExercise[]
}

export type PlanTransferData = {
  plans: PlanTransferPlan[]
  cycle: Array<number | null>
}

export type PlanTemplateExportOption = {
  id: string
  name: string
  exerciseCount: number
}

export type PlanTransferParseError = 'missingJson' | 'invalidJson' | 'invalidShape' | 'emptyExercises'

export type PlanTransferParseResult =
  | { ok: true; data: PlanTransferData }
  | { ok: false; error: PlanTransferParseError }

function extractJsonSource(input: string) {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const lower = trimmed.toLowerCase()
  const blockStart = lower.indexOf('```json')
  if (blockStart === -1) {
    return trimmed
  }

  const contentStart = trimmed.indexOf('\n', blockStart)
  if (contentStart === -1) {
    return null
  }

  const blockEnd = trimmed.indexOf('```', contentStart + 1)
  if (blockEnd === -1) {
    return null
  }

  return trimmed.slice(contentStart + 1, blockEnd).trim()
}

function parseRequiredInteger(value: unknown, fallback: number, min: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.floor(value))
    : fallback
}

function parseOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseExercise(source: Record<string, unknown>): PlanTransferExercise | null {
  const name = readString(source.name)
  if (!name) {
    return null
  }

  return {
    name,
    catalogExerciseId: readString(source.catalogExerciseId) || null,
    targetSets: parseRequiredInteger(source.targetSets, 3, 1),
    restSeconds: parseRequiredInteger(source.restSeconds, 90, 0),
    weightKg: parseOptionalNumber(source.weightKg),
    reps: parseOptionalNumber(source.reps),
    durationSeconds: parseOptionalNumber(source.durationSeconds),
    distanceMeters: parseOptionalNumber(source.distanceMeters),
  } satisfies PlanTransferExercise
}

function parsePlan(source: Record<string, unknown>, defaultPlanName: string): PlanTransferPlan | null {
  if (!Array.isArray(source.exercises)) {
    return null
  }

  const exercises = source.exercises
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map(parseExercise)
    .filter((exercise): exercise is PlanTransferExercise => exercise !== null)

  if (exercises.length === 0) {
    return null
  }

  return {
    planName: readString(source.planName) || defaultPlanName,
    exercises,
  } satisfies PlanTransferPlan
}

function parseCycle(cycleValue: unknown, planCount: number) {
  if (!Array.isArray(cycleValue)) {
    return [] as Array<number | null>
  }

  return cycleValue
    .map((item) => {
      if (item === null) {
        return null
      }

      if (typeof item === 'number' && Number.isFinite(item)) {
        const planIndex = Math.floor(item)
        return planIndex >= 0 && planIndex < planCount ? planIndex : undefined
      }

      if (typeof item === 'object' && item !== null) {
        const planIndexValue = (item as Record<string, unknown>).planIndex
        if (planIndexValue === null) {
          return null
        }
        if (typeof planIndexValue === 'number' && Number.isFinite(planIndexValue)) {
          const planIndex = Math.floor(planIndexValue)
          return planIndex >= 0 && planIndex < planCount ? planIndex : undefined
        }
      }

      return undefined
    })
    .filter((slot): slot is number | null => slot !== undefined)
}

export function parsePlanTransferJson(input: string, defaultPlanName: string): PlanTransferParseResult {
  const jsonSource = extractJsonSource(input)
  if (!jsonSource) {
    return { ok: false, error: 'missingJson' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonSource)
  } catch {
    return { ok: false, error: 'invalidJson' }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'invalidShape' }
  }

  const source = parsed as Record<string, unknown>
  const plansValue = source.plans
  const hasPlansArray = Array.isArray(plansValue)
  if (!hasPlansArray && !Array.isArray(source.exercises)) {
    return { ok: false, error: 'invalidShape' }
  }

  const planSources = hasPlansArray
    ? plansValue.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    : [source]
  const plans = planSources
    .map((planSource, index) =>
      parsePlan(planSource, planSources.length > 1 ? `${defaultPlanName} ${index + 1}` : defaultPlanName),
    )
    .filter((plan): plan is PlanTransferPlan => plan !== null)

  if (plans.length === 0) {
    return { ok: false, error: 'emptyExercises' }
  }

  return {
    ok: true,
    data: {
      plans,
      cycle: parseCycle(source.cycle, plans.length),
    },
  }
}

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
  } satisfies PlanTransferData
}

export async function importPlanTransferData(data: PlanTransferData) {
  const createdPlans: PlanWithExercises[] = []

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
