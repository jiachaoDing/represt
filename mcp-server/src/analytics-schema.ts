import { z } from 'zod'
import { dateKey, versionSchema } from './schemas.js'

export const measurementSchema = z.enum(['weightReps', 'reps', 'duration', 'distance', 'weightDistance', 'leftRightWeightReps', 'durationReps'])
export const analyticsInput = z.object({
  query: z.enum(['workout_summary', 'overview', 'history', 'exercise_progress', 'frequency', 'volume', 'muscle_distribution', 'personal_records', 'plateaus']),
  version: versionSchema.optional().describe('Omit on the first call to use the current snapshot. Reuse the returned version for pagination; restart on VERSION_CONFLICT.'),
  from: dateKey.describe('Inclusive local sessionDateKey, not a UTC timestamp. Supply the user\'s intended calendar range.'),
  to: dateKey.describe('Inclusive local sessionDateKey. Today requires the user\'s local date.'),
  bucket: z.enum(['day', 'week', 'month']).default('week').describe('Calendar buckets; weeks start Monday. Boundary buckets can be partial.'),
  exerciseKey: z.string().min(1).max(300).optional().describe('Exact exerciseKey returned by this tool: catalog:ID or name:NORMALIZED_NAME.'),
  exerciseName: z.string().trim().min(1).max(200).optional().describe('Exact name after NFKC/case/whitespace normalization. Ambiguous identities are rejected.'),
  muscleGroup: z.string().min(1).max(100).optional().describe('Filter actual sets whose known distribution contains this muscle; unknown classifications do not match.'),
  sessionId: z.string().min(1).max(120).optional().describe('Optional actual session filter, useful for history details.'),
  offset: z.number().int().nonnegative().default(0),
  limit: z.number().int().min(1).max(100).default(50),
  minTrainingDays: z.number().int().min(3).max(100).default(3).describe('plateaus: minimum distinct observed training dates.'),
  minSpanDays: z.number().int().min(1).max(3660).default(21).describe('plateaus: minimum span between first and last observations.'),
  compare: z.enum(['none', 'previous_period']).default('none').describe('Also aggregate the immediately preceding equal-length date range, without another tool call.'),
}).strict().superRefine((v, ctx) => {
  if (v.offset > 0 && v.version === undefined) ctx.addIssue({ code: 'custom', message: 'Pagination requires the version returned by the first page.' })
  if (v.compare === 'previous_period' && Date.parse(v.from) - (Date.parse(v.to) - Date.parse(v.from) + 86400000) < Date.parse('0001-01-01')) {
    ctx.addIssue({ code: 'custom', message: 'Comparison range falls outside supported years.' })
  }
  if (v.query === 'workout_summary' && (v.exerciseKey || v.exerciseName || v.muscleGroup)) {
    ctx.addIssue({ code: 'custom', message: 'workout_summary describes whole sessions; use sessionId or dates to select them.' })
  }
  if (v.from > v.to || (Date.parse(v.to) - Date.parse(v.from)) / 86400000 > 3660) {
    ctx.addIssue({ code: 'custom', message: 'Use an ordered range spanning at most 3660 days.' })
  }
  if (v.from < '0001-01-01' || v.to > '9998-12-31') ctx.addIssue({ code: 'custom', message: 'Supported calendar years are 0001 through 9998.' })
  if (v.exerciseKey && v.exerciseName) ctx.addIssue({ code: 'custom', message: 'Choose exerciseKey or exerciseName.' })
  if (v.query === 'exercise_progress' && !v.exerciseKey && !v.exerciseName) {
    ctx.addIssue({ code: 'custom', message: 'exercise_progress requires exerciseKey or exerciseName.' })
  }
})
export type AnalyticsInput = z.infer<typeof analyticsInput>
const rows = z.array(z.record(z.string(), z.unknown()))
const timestamp = z.string().refine((s) => Number.isFinite(Date.parse(s)), 'Use a valid timestamp')
export const snapshotSchema = z.object({
  version: versionSchema, syncedAt: timestamp.nullable(),
  snapshotVersion: versionSchema.nullable().optional(), pending: z.boolean().optional(),
  backup: z.object({ schemaVersion: z.literal(1), exportedAt: timestamp, tables: z.object({
    workoutSessions: rows, performedExercises: rows, setRecords: rows, sessionPlanItems: rows, exerciseProfiles: rows,
  }) }),
})
export type TrainingSnapshot = z.infer<typeof snapshotSchema>

const nullableNumber = z.number().finite().nullable()
export const totalsSchema = z.object({
  completedSets: z.number().int().nonnegative(),
  reps: nullableNumber, durationSeconds: nullableNumber, distanceMeters: nullableNumber,
  weightRepsKg: nullableNumber, loadDistanceKgMeters: nullableNumber,
  observedSets: z.object({ reps: z.number(), durationSeconds: z.number(), distanceMeters: z.number(),
    weightRepsKg: z.number(), loadDistanceKgMeters: z.number() }),
})
const outputFields = {
  version: versionSchema, syncedAt: timestamp,
  schemaVersion: z.literal(1), exportedAt: z.string(),
  range: z.object({ from: dateKey, to: dateKey, dateBasis: z.literal('sessionDateKey'), weekStartsOn: z.literal('Monday') }),
  status: z.enum(['ok', 'no_matching_data', 'insufficient_history']),
  coverage: z.object({ firstTrainingDate: dateKey.nullable(), lastTrainingDate: dateKey.nullable(),
    matchedSessions: z.number(), matchedSets: z.number() }),
  warnings: z.array(z.object({ code: z.string(), count: z.number(), message: z.string() })),
  total: z.number().int().nonnegative(), nextOffset: z.number().int().nonnegative().nullable(),
  snapshotVersion: versionSchema.nullable().optional(), pending: z.boolean().optional(),
  units: z.record(z.string(), z.string()).optional(),
  comparison: z.object({ from: dateKey, to: dateKey, summary: totalsSchema.extend({ sessions: z.number(), trainingDays: z.number() }),
    delta: z.record(z.string(), nullableNumber) }).optional(),
}
const scopeSchema = totalsSchema.extend({ sessions: z.number(), trainingDays: z.number() })
const bucketFields = { bucketStart: dateKey, bucketEnd: dateKey, from: dateKey, to: dateKey, partial: z.boolean() }
const exerciseFields = { exerciseKey: z.string(), name: z.string(), catalogExerciseId: z.string().nullable(),
  measurementType: z.enum([...measurementSchema.options, 'unknown']) }
const bestSchema = z.object({ metric: z.enum(['weightKg', 'reps', 'durationSeconds', 'distanceMeters', 'weightRepsKg', 'loadDistanceKgMeters']),
  unit: z.enum(['kg', 'reps', 's', 'm', 'kg*reps', 'kg*m']), value: z.number().finite(), setRecordId: z.string(),
  sessionId: z.string(), sessionDateKey: dateKey, completedAt: timestamp })
const exerciseTotals = totalsSchema.extend({ ...exerciseFields, best: z.array(bestSchema) })
const setDetail = z.object({ id: z.string(), performedExerciseId: z.string(), planItemId: z.string().nullable(),
  setNumber: nullableNumber, completedAt: timestamp, weightKg: nullableNumber, reps: nullableNumber,
  durationSeconds: nullableNumber, distanceMeters: nullableNumber })
const deltas = z.record(z.string(), nullableNumber)
const workoutSummary = totalsSchema.extend({
  sessionId: z.string(), date: dateKey, plannedPlanId: z.string().nullable(), plannedPlanNameSnapshot: z.string().nullable(),
  hasRecordedTraining: z.boolean(),
  planItems: z.array(z.object({ id: z.string(), name: z.string().nullable(), planExerciseId: z.string().nullable(),
    targetSets: nullableNumber, completedSets: z.number(), defaults: z.object({ weightKg: nullableNumber, reps: nullableNumber,
      durationSeconds: nullableNumber, distanceMeters: nullableNumber }) })),
  completion: z.object({ basis: z.string(), knownTargetSets: z.number(), creditedSets: z.number(),
    itemsMissingTargets: z.number(), unplannedSets: z.number(), rate: nullableNumber }),
  exercises: z.array(totalsSchema.extend({ ...exerciseFields, sets: z.array(setDetail),
    previous: totalsSchema.extend({ sets: z.array(setDetail), delta: deltas }).nullable() })),
  previous: totalsSchema.extend({ sessionId: z.string(), date: dateKey, matchBasis: z.string(), delta: deltas,
    removedExercises: z.array(z.object(exerciseFields)) }).nullable(),
})
const seriesFields = { ...exerciseFields, metric: bestSchema.shape.metric.nullable(), unit: bestSchema.shape.unit.nullable(),
  observedTrainingDays: z.number(), sufficient: z.boolean(), firstValue: nullableNumber, latestValue: nullableNumber,
  delta: nullableNumber, changePercent: nullableNumber }
function outputFor<Q extends AnalyticsInput['query'], S extends z.ZodType, I extends z.ZodType>(query: Q, summary: S, item: I) {
  return z.object({ ...outputFields, query: z.literal(query), summary, items: z.array(item) })
}
export const analyticsOutput = z.discriminatedUnion('query', [
  outputFor('workout_summary', scopeSchema, workoutSummary),
  outputFor('overview', scopeSchema.extend({ exerciseCount: z.number(), firstTrainingDate: dateKey.nullable(), lastTrainingDate: dateKey.nullable(),
    emptySessions: z.number(), planned: z.object({ scope: z.string(), items: z.number(), knownTargetSets: z.number(), itemsMissingTargets: z.number() }) }), z.never()),
  outputFor('history', scopeSchema, totalsSchema.extend({ sessionId: z.string(), date: dateKey,
    plannedPlanNameSnapshot: z.string().nullable(), hasRecordedTraining: z.literal(true), exercises: z.array(exerciseTotals) })),
  outputFor('frequency', scopeSchema.extend({ meanGapDays: nullableNumber, gapStandardDeviationDays: nullableNumber,
    gapCoefficientOfVariation: nullableNumber, completeBuckets: z.number(), interpretation: z.string() }),
  z.object({ ...bucketFields, sessions: z.number(), trainingDays: z.number(), completedSets: z.number() })),
  outputFor('volume', scopeSchema, exerciseTotals.extend(bucketFields)),
  outputFor('muscle_distribution', scopeSchema, z.object({ ...bucketFields, muscleGroup: z.string(), weightedSets: z.number(),
    setShare: z.number(), weightedMetrics: totalsSchema, classificationSources: z.array(z.enum(['catalog', 'profile', 'unknown'])) })),
  outputFor('personal_records', scopeSchema.extend({ recordScope: z.string() }), z.object({ ...exerciseFields, best: z.array(bestSchema) })),
  outputFor('exercise_progress', scopeSchema.extend({ series: z.array(z.object(seriesFields)) }),
    totalsSchema.extend({ ...seriesFields, date: dateKey, best: z.array(bestSchema), value: nullableNumber })),
  outputFor('plateaus', scopeSchema.extend({ evaluatedSeries: z.number(), eligibleSeries: z.number(), excludedInsufficientSeries: z.number(),
    minTrainingDays: z.number(), minSpanDays: z.number(), interpretation: z.string() }),
  z.object({ ...seriesFields, firstDate: dateKey, lastDate: dateKey, spanDays: z.number(), criterion: z.string() })),
])
