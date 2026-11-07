import { expect, it } from 'vitest'
import { prepareFacts } from '../src/analytics-data.js'
import { aggregateTraining } from '../src/analytics.js'
import { snapshotSchema, analyticsOutput } from '../src/analytics-schema.js'
import { mergeProgram } from '../src/program.js'
import { trainingFixture, query } from './analytics-fixture.js'
import type { Program } from '../src/schemas.js'

it('accepts v2 snapshots and keeps renamed custom movements in one identity', () => {
  const snapshot = trainingFixture()
  snapshot.backup.schemaVersion = 2
  for (const exercise of snapshot.backup.tables.performedExercises) {
    if (exercise.catalogExerciseId === 'barbellBenchPress') {
      exercise.exerciseProfileId = 'custom:stable'
      exercise.catalogExerciseId = null
      exercise.name = String(exercise.id)
    }
  }
  expect(snapshotSchema.safeParse(snapshot).success).toBe(true)
  const facts = prepareFacts(snapshot).facts.filter((fact) => fact.exercise.exerciseProfileId === 'custom:stable')
  expect(new Set(facts.map((fact) => fact.exerciseKey))).toEqual(new Set(['custom:stable']))
  expect(analyticsOutput.safeParse(aggregateTraining(snapshot, query())).success).toBe(true)
})

it('omits ordinary load metrics for assistance, including bilateral records', () => {
  const snapshot = trainingFixture()
  for (const record of snapshot.backup.tables.setRecords) {
    record.loadMode = 'assisted'
    record.measurementType = 'leftRightWeightReps'
    record.rightWeightKg = 100
    record.rightReps = 8
  }
  for (const fact of prepareFacts(snapshot).facts) {
    expect(fact.values.weightKg).toBeUndefined()
    expect(fact.values.weightRepsKg).toBeUndefined()
  }
})

it('keeps exercise identity through plan edits and creates identities for new exercises', () => {
  const before: Program = { plans: [], cycle: null }
  const next = mergeProgram(before, { expectedVersion: 0, confirmedByUser: true, userInstruction: 'Add exercises.', plans: [{ name: 'P', exercises: [
    { name: 'Assisted pull-up', catalogExerciseId: 'oedb:477', targetSets: 3, restSeconds: 90 },
    { name: 'Custom', targetSets: 3, restSeconds: 90 },
  ] }] })
  expect(next.plans[0].exercises[0]).toMatchObject({ exerciseProfileId: 'catalog:oedb:477', loadMode: 'assisted' })
  const custom = next.plans[0].exercises[1]
  expect(custom.exerciseProfileId).toMatch(/^custom:/)
  const renamed = mergeProgram(next, { expectedVersion: 1, confirmedByUser: true, userInstruction: 'Rename.', plans: [{ id: next.plans[0].id, exercises: [{ id: custom.id, name: 'Renamed' }] }] })
  expect(renamed.plans[0].exercises[1].exerciseProfileId).toBe(custom.exerciseProfileId)
})
