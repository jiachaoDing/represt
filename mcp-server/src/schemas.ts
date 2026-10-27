import { z } from 'zod'

const id = z.string().min(1).max(120)
const name = z.string().min(1).max(200).refine((s) => Boolean(s.trim()), 'Name cannot be blank')
const nonnegative = z.number().finite().nonnegative()
export const versionSchema = z.number().int().nonnegative()
export const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const date = new Date(s)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === s
}, 'Use a real calendar date in YYYY-MM-DD format')
const timestamp = z.string().refine((s) => Number.isFinite(Date.parse(s)), 'Use an ISO timestamp')
export const exerciseFields = {
  name, catalogExerciseId: id.nullable(),
  measurementType: z.enum(['weightReps', 'reps', 'duration', 'distance', 'weightDistance', 'leftRightWeightReps', 'durationReps']),
  targetSets: z.number().int().positive(), restSeconds: nonnegative.int(),
  weightKg: nonnegative.nullable(), reps: nonnegative.int().nullable(),
  rightWeightKg: nonnegative.nullable().optional(), rightReps: nonnegative.int().nullable().optional(),
  durationSeconds: nonnegative.nullable(), distanceMeters: nonnegative.nullable(),
}
export const exerciseSchema = z.object({ id, planId: id, ...exerciseFields, order: nonnegative.int() })
export const planSchema = z.object({ id, name, createdAt: timestamp, updatedAt: timestamp, exercises: z.array(exerciseSchema) })
export const slotSchema = z.object({ id, planId: id.nullable() })
export const cycleSchema = z.object({
  id: z.literal('default'), slots: z.array(slotSchema).max(10000),
  anchorDateKey: dateKey, anchorIndex: nonnegative.int(), updatedAt: timestamp,
})
export const programSchema = z.object({ plans: z.array(planSchema), cycle: cycleSchema.nullable() })
export const stateSchema = z.object({
  version: versionSchema, syncedAt: timestamp.nullable(), pending: z.boolean(), plans: programSchema.nullable(),
})
export type Program = z.infer<typeof programSchema>
export type ProgramState = z.infer<typeof stateSchema>
export const tableSchema = z.enum(['workoutSessions', 'sessionPlanItems', 'performedExercises', 'setRecords',
  'exerciseProfiles', 'workoutPlans', 'planExercises', 'trainingCycles', 'sharedPlanRecords'])
export const historyInput = z.object({
  table: tableSchema.describe('Read linked tables using sessionId and performedExerciseId. All tables are accessible.'),
  version: versionSchema.describe('Version returned by get_training_program; use one version throughout pagination.'),
  from: dateKey.optional(), to: dateKey.optional(), offset: nonnegative.int().default(0),
  limit: z.number().int().min(1).max(1000).default(100),
}).strict().refine((v) => !v.from || !v.to || v.from <= v.to, 'from must be on or before to')
export const historyPageSchema = z.object({
  version: versionSchema, syncedAt: timestamp, total: nonnegative.int(),
  records: z.array(z.record(z.string(), z.unknown())), nextOffset: nonnegative.int().nullable(),
})
const exerciseChange = z.object({ id: id.optional(), ...z.object(exerciseFields).partial().shape }).strict()
const planChange = z.object({
  id: id.optional().describe('Existing plan ID. Omit only when creating a new plan; the server generates its ID.'),
  name: name.optional(), exercises: z.array(exerciseChange).max(10000).optional(),
  removeExerciseIds: z.array(id).optional(), exerciseOrder: z.array(id).optional(),
}).strict()
export const updateInput = z.object({
  expectedVersion: versionSchema,
  userInstruction: z.string().trim().min(1).max(2000).describe('The explicit user request authorizing these changes.'),
  confirmedByUser: z.literal(true).describe('Only set after the user explicitly requested or approved this change.'),
  plans: z.array(planChange).max(10000).optional(), removePlanIds: z.array(id).optional(),
  cycle: z.object({
    slots: z.array(z.object({ id: id.optional(), planId: id.nullable() }).strict()).max(10000),
    anchorDateKey: dateKey, anchorIndex: nonnegative.int(),
  }).strict().nullable().optional().describe('Omit to preserve the cycle; null explicitly removes it. Null planId is a rest day.'),
}).strict()
export type ProgramUpdate = z.infer<typeof updateInput>

export const errorSchema = z.object({
  code: z.string(), message: z.string(), retryable: z.boolean(),
  saved: z.boolean().nullable().optional(), verified: z.boolean().optional(),
})
export const resultSchema = <T extends z.ZodType>(data: T) => z.object({
  ok: z.boolean(), data: data.optional(), error: errorSchema.optional(),
})
