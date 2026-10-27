import { z } from 'zod'
import catalog from './catalog.json' with { type: 'json' }
import { dateKey } from './schemas.js'
import { measurementSchema, type TrainingSnapshot } from './analytics-schema.js'

const id = z.string().min(1)
const optionalText = z.string().nullish()
const sessionSchema = z.object({ id, sessionDateKey: dateKey, plannedPlanId: optionalText, plannedPlanNameSnapshot: optionalText })
const exerciseSchema = z.object({ id, sessionId: id, name: z.string(), catalogExerciseId: optionalText,
  measurementType: z.unknown().optional(), planItemId: optionalText, sourcePlanSnapshot: z.unknown().optional() })
const setSchema = z.object({ id, sessionId: id, performedExerciseId: id, completedAt: z.string().refine((s) => Number.isFinite(Date.parse(s))),
  setNumber: z.unknown().optional(),
  weightKg: z.unknown().optional(), reps: z.unknown().optional(), durationSeconds: z.unknown().optional(), distanceMeters: z.unknown().optional() })
const distributionSchema = z.array(z.object({ muscleGroupId: id, ratio: z.number().finite().positive().max(1) })).min(1)
const historicalSchema = z.object({ measurementType: z.unknown().optional(), catalogExerciseId: z.unknown().optional() })
export const normalizeName = (s: string) => s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
export type Measurement = z.infer<typeof measurementSchema> | 'unknown'
export type Session = z.infer<typeof sessionSchema>
export type Warning = { code: string; count: number; message: string }
export type Fact = {
  set: z.infer<typeof setSchema>; session: Session; exercise: z.infer<typeof exerciseSchema>
  exerciseKey: string; measurementType: Measurement
  distribution: Array<{ muscleGroupId: string; ratio: number }> | null
  distributionSource: 'profile' | 'catalog' | 'unknown'
  values: Partial<Record<Metric, number>>
}
export const metricUnits = { weightKg: 'kg', reps: 'reps', durationSeconds: 's', distanceMeters: 'm',
  weightRepsKg: 'kg*reps', loadDistanceKgMeters: 'kg*m' } as const
export type Metric = keyof typeof metricUnits
const catalogById = new Map(catalog.map((e) => [e.id, e]))

export function prepareFacts(snapshot: TrainingSnapshot) {
  const tables = snapshot.backup.tables
  const warnings = new Map<string, Warning>()
  const warn = (code: string, message: string, count = 1) => {
    const current = warnings.get(code)
    warnings.set(code, { code, count: (current?.count ?? 0) + count, message })
  }
  function parseRows<T extends { id: string }>(values: unknown[], schema: z.ZodType<T>, table: string) {
    const parsed = new Map<string, T>()
    const duplicateIds = new Set<string>()
    for (const row of values) {
      const result = schema.safeParse(row)
      if (!result.success) { warn('INVALID_ROWS', 'Malformed rows were excluded; counts cover the whole snapshot.'); continue }
      if (parsed.has(result.data.id) || duplicateIds.has(result.data.id)) {
        parsed.delete(result.data.id); duplicateIds.add(result.data.id)
        warn('DUPLICATE_IDS', `Duplicate IDs were excluded rather than counted twice (${table}).`)
      } else parsed.set(result.data.id, result.data)
    }
    return parsed
  }
  const sessions = parseRows(tables.workoutSessions, sessionSchema, 'workoutSessions')
  const exercises = parseRows(tables.performedExercises, exerciseSchema, 'performedExercises')
  const sets = parseRows(tables.setRecords, setSchema, 'setRecords')
  const profiles = parseRows(tables.exerciseProfiles, z.object({ id }).passthrough(), 'exerciseProfiles')
  const plannedItems = parseRows(tables.sessionPlanItems, z.object({ id, sessionId: id,
    name: optionalText, planExerciseId: optionalText, order: z.unknown().optional(),
    targetSets: z.number().int().nonnegative().optional().catch(undefined), defaultWeightKg: z.unknown().optional(), defaultReps: z.unknown().optional(),
    defaultDurationSeconds: z.unknown().optional(), defaultDistanceMeters: z.unknown().optional() }), 'sessionPlanItems')
  const facts: Fact[] = []
  for (const set of sets.values()) {
    const session = sessions.get(set.sessionId)
    const exercise = exercises.get(set.performedExerciseId)
    if (!session || !exercise || exercise.sessionId !== session.id) {
      warn('BROKEN_LINKS', 'Completed sets with missing or conflicting session/exercise links were excluded.'); continue
    }
    const historical = historicalSchema.safeParse(exercise.sourcePlanSnapshot)
    const catalogExerciseId = exercise.catalogExerciseId?.trim() ||
      (historical.success && typeof historical.data.catalogExerciseId === 'string' ? historical.data.catalogExerciseId.trim() : null)
    const exerciseKey = catalogExerciseId ? `catalog:${catalogExerciseId}`
      : normalizeName(exercise.name) ? `name:${normalizeName(exercise.name)}` : `exercise:${exercise.id}`
    const profile = profiles.get(exerciseKey)
    const entry = catalogById.get(catalogExerciseId ?? '')
    // Historical per-performance metadata wins over a subsequently edited profile.
    const measurement = exercise.measurementType ?? (historical.success ? historical.data.measurementType : undefined)
      ?? profile?.measurementType ?? entry?.measurementType
    const parsedMeasurement = measurementSchema.safeParse(measurement)
    const measurementType = parsedMeasurement.success ? parsedMeasurement.data : 'unknown'
    if (measurementType === 'unknown') warn('UNKNOWN_MEASUREMENT', 'Sets with unknown measurement types count as completed sets but contribute no numeric metrics.')
    const rawDistribution = profile ? profile.muscleDistribution : entry?.muscleDistribution
    const parsedDistribution = distributionSchema.safeParse(rawDistribution)
    const distribution = parsedDistribution.success &&
      new Set(parsedDistribution.data.map((d) => d.muscleGroupId)).size === parsedDistribution.data.length &&
      Math.abs(parsedDistribution.data.reduce((sum, d) => sum + d.ratio, 0) - 1) < 0.000001
      ? parsedDistribution.data : null
    if (!distribution) warn('UNKNOWN_MUSCLES', 'Unclassified sets are reported as unknown; missing/invalid distributions are not inferred.')
    const values: Fact['values'] = {}
    const allowed = measurementType === 'weightReps' ? ['weightKg', 'reps'] : measurementType === 'weightDistance'
      ? ['weightKg', 'distanceMeters'] : measurementType === 'reps' ? ['reps'] : measurementType === 'duration'
        ? ['durationSeconds'] : measurementType === 'distance' ? ['distanceMeters'] : []
    for (const key of allowed as Array<'weightKg' | 'reps' | 'durationSeconds' | 'distanceMeters'>) {
      const value = set[key]
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && (key !== 'reps' || Number.isInteger(value))) values[key] = value
      else warn('MISSING_METRICS', 'Missing/invalid metric fields were omitted; planned defaults never fill actual values.')
    }
    if (measurementType === 'weightReps' && values.weightKg !== undefined && values.reps !== undefined) {
      const product = values.weightKg * values.reps
      if (Number.isFinite(product)) values.weightRepsKg = product
    }
    if (measurementType === 'weightDistance' && values.weightKg !== undefined && values.distanceMeters !== undefined) {
      const product = values.weightKg * values.distanceMeters
      if (Number.isFinite(product)) values.loadDistanceKgMeters = product
    }
    facts.push({ set, session, exercise: { ...exercise, catalogExerciseId }, exerciseKey, measurementType, distribution,
      distributionSource: distribution ? profile ? 'profile' : 'catalog' : 'unknown', values })
  }
  if (facts.some((f) => f.distributionSource === 'profile')) {
    warn('PROFILE_CLASSIFICATION', 'Profile muscle classifications are from the synced snapshot; historical per-set muscle snapshots do not exist.')
  }
  return { facts, sessions, plannedItems, warnings, warn }
}
