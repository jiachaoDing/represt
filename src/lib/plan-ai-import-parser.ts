export type PlanAiImportExercise = {
  name: string
  targetSets: number
  restSeconds: number
  weightKg: number | null
  reps: number | null
  durationSeconds: number | null
  distanceMeters: number | null
}

export type PlanAiImportPlan = {
  planName: string
  exercises: PlanAiImportExercise[]
}

export type PlanAiImportCycleSlot = {
  planIndex: number | null
}

export type PlanAiImportData = {
  plans: PlanAiImportPlan[]
  cycle: PlanAiImportCycleSlot[]
}

export type PlanAiImportParseError =
  | 'missingJson'
  | 'invalidJson'
  | 'invalidShape'
  | 'emptyExercises'

export type PlanAiImportParseResult =
  | { ok: true; data: PlanAiImportData }
  | { ok: false; error: PlanAiImportParseError }

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

function parsePlan(source: Record<string, unknown>, defaultPlanName: string) {
  const exercisesValue = source.exercises
  if (!Array.isArray(exercisesValue)) {
    return null
  }

  const exercises = exercisesValue
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      name: readString(item.name),
      targetSets: parseRequiredInteger(item.targetSets, 3, 1),
      restSeconds: parseRequiredInteger(item.restSeconds, 90, 0),
      weightKg: parseOptionalNumber(item.weightKg),
      reps: parseOptionalNumber(item.reps),
      durationSeconds: parseOptionalNumber(item.durationSeconds),
      distanceMeters: parseOptionalNumber(item.distanceMeters),
    }))
    .filter((exercise) => exercise.name.length > 0)

  if (exercises.length === 0) {
    return null
  }

  return {
    planName: readString(source.planName) || defaultPlanName,
    exercises,
  } satisfies PlanAiImportPlan
}

function parseCycle(cycleValue: unknown, planCount: number) {
  if (!Array.isArray(cycleValue)) {
    return [] satisfies PlanAiImportCycleSlot[]
  }

  return cycleValue
    .map((item) => {
      if (item === null) {
        return { planIndex: null } satisfies PlanAiImportCycleSlot
      }

      if (typeof item === 'number' && Number.isFinite(item)) {
        const planIndex = Math.floor(item)
        return planIndex >= 0 && planIndex < planCount
          ? ({ planIndex } satisfies PlanAiImportCycleSlot)
          : null
      }

      return null
    })
    .filter((slot): slot is PlanAiImportCycleSlot => slot !== null)
}

export function parsePlanAiImportResponse(
  input: string,
  defaultPlanName: string,
): PlanAiImportParseResult {
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
    .map((planSource, index) => parsePlan(planSource, planSources.length > 1 ? `${defaultPlanName} ${index + 1}` : defaultPlanName))
    .filter((plan): plan is PlanAiImportPlan => plan !== null)

  if (plans.length === 0) {
    return { ok: false, error: 'emptyExercises' }
  }

  const cycle = parseCycle(source.cycle, plans.length)

  return {
    ok: true,
    data: {
      plans,
      cycle,
    },
  }
}
