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

export type PlanAiImportParseError =
  | 'missingJson'
  | 'invalidJson'
  | 'invalidShape'
  | 'emptyExercises'

export type PlanAiImportParseResult =
  | { ok: true; plan: PlanAiImportPlan }
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

  if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as { exercises?: unknown }).exercises)) {
    return { ok: false, error: 'invalidShape' }
  }

  const source = parsed as { planName?: unknown; exercises: unknown[] }
  const exercises = source.exercises
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
    return { ok: false, error: 'emptyExercises' }
  }

  return {
    ok: true,
    plan: {
      planName: readString(source.planName) || defaultPlanName,
      exercises,
    },
  }
}
