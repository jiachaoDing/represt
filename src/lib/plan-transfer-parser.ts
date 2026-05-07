import {
  movementPatterns,
  muscleGroups,
  type MovementPattern,
  type MuscleDistributionItem,
  type MuscleGroup,
} from '../domain/exercise-catalog'
import type {
  PlanTransferExercise,
  PlanTransferExerciseModel,
  PlanTransferParseResult,
  PlanTransferPlan,
} from './plan-transfer-types'

const movementPatternSet = new Set<string>(movementPatterns)
const muscleGroupSet = new Set<string>(muscleGroups)

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

function parseMovementPattern(value: unknown) {
  const movementPattern = readString(value)
  return movementPatternSet.has(movementPattern) ? (movementPattern as MovementPattern) : null
}

function parseMuscleDistribution(value: unknown) {
  if (!Array.isArray(value)) {
    return null
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => {
      const muscleGroupId = readString(item.muscleGroupId)
      const ratio = item.ratio
      const hasValidMuscleGroup = muscleGroupSet.has(muscleGroupId)
      const hasValidRatio = typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0
      if (!hasValidMuscleGroup || !hasValidRatio) {
        return null
      }

      return {
        muscleGroupId: muscleGroupId as MuscleGroup,
        ratio,
      } satisfies MuscleDistributionItem
    })
    .filter((item): item is MuscleDistributionItem => item !== null)
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

function parseExerciseModel(source: Record<string, unknown>): PlanTransferExerciseModel | null {
  const name = readString(source.name)
  const movementPattern = parseMovementPattern(source.movementPattern)
  const muscleDistribution = parseMuscleDistribution(source.muscleDistribution)

  if (!name || !movementPattern || !muscleDistribution) {
    return null
  }

  return {
    name,
    catalogExerciseId: readString(source.catalogExerciseId) || null,
    movementPattern,
    muscleDistribution,
  } satisfies PlanTransferExerciseModel
}

function parseExerciseModels(value: unknown) {
  if (value === undefined) {
    return [] as PlanTransferExerciseModel[]
  }

  if (!Array.isArray(value)) {
    return null
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map(parseExerciseModel)
    .filter((model): model is PlanTransferExerciseModel => model !== null)
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

  const exerciseModels = parseExerciseModels(source.exerciseModels)
  if (!exerciseModels) {
    return { ok: false, error: 'invalidShape' }
  }

  return {
    ok: true,
    data: {
      plans,
      cycle: parseCycle(source.cycle, plans.length),
      exerciseModels,
    },
  }
}
