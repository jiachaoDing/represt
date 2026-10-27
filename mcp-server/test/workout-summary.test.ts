import { expect, it } from 'vitest'
import { aggregateTraining, queryTrainingAnalytics } from '../src/analytics.js'
import { analyticsInput, analyticsOutput } from '../src/analytics-schema.js'
import { ReprestApi } from '../src/api.js'
import { trainingFixture, query } from './analytics-fixture.js'

it('returns every actual set, historical targets, capped adherence and prior same-plan comparisons', () => {
  const snapshot = trainingFixture()
  const t = snapshot.backup.tables
  for (const s of t.workoutSessions) s.plannedPlanId = 'plan-1'
  t.sessionPlanItems.push({ id: 'bench-target', sessionId: 's3', name: 'Bench', targetSets: 1 },
    { id: 'missed', sessionId: 's3', name: 'Missed', targetSets: 3 })
  for (const e of t.performedExercises) if (e.id === 'e-s3' || e.id === 'bench-repeat') e.planItemId = 'bench-target'
  const result = aggregateTraining(snapshot, query({ query: 'workout_summary', from: '2026-10-22', to: '2026-10-22' }))
  const item = result.items[0]
  expect(item).toMatchObject({ completedSets: 7, completion: { knownTargetSets: 4, creditedSets: 1, rate: 0.25, unplannedSets: 5 },
    previous: { sessionId: 's2', date: '2026-10-08', matchBasis: 'plannedPlanId', delta: { completedSets: 6 } } })
  const bench = (item.exercises as Array<Record<string, unknown>>).find((e) => e.exerciseKey === 'catalog:barbellBenchPress')!
  expect(bench.sets).toHaveLength(2)
  expect(bench.previous).toMatchObject({ completedSets: 1, sets: [{ weightKg: 55, reps: 10 }], delta: { weightRepsKg: 350 } })
  expect(item.planItems).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'missed', completedSets: 0 })]))
  expect(analyticsOutput.parse(result)).toEqual(result)
})

it('uses exact exercise identities and measurement types when plan identity is absent; skips empty and future sessions', () => {
  const result = aggregateTraining(trainingFixture(), query({ query: 'workout_summary', from: '2026-10-08', to: '2026-10-08' }))
  expect(result.items[0]).toMatchObject({ previous: { sessionId: 's1', date: '2026-10-01' }, completion: { rate: null } })
  const empty = aggregateTraining(trainingFixture(), query({ query: 'workout_summary', from: '2026-10-25', to: '2026-10-25' }))
  expect(empty).toMatchObject({ status: 'no_matching_data', items: [{ hasRecordedTraining: false, completedSets: 0, previous: null }] })
  expect(aggregateTraining(trainingFixture(), query({ query: 'workout_summary', from: '2026-10-24', to: '2026-10-24' })).items).toEqual([])
})

it('does not replace absent or malformed targets with current-plan defaults', () => {
  const snapshot = trainingFixture()
  snapshot.backup.tables.sessionPlanItems.push({ id: 'unknown-target', sessionId: 's3', targetSets: -1 })
  expect(aggregateTraining(snapshot, query({ query: 'workout_summary', sessionId: 's3' })).items[0]).toMatchObject({
    completion: { rate: null, itemsMissingTargets: 1 },
  })
})

it('adds a preceding equal-length period and preserves units without another read', () => {
  const result = aggregateTraining(trainingFixture(), query({ query: 'overview', from: '2026-10-08', to: '2026-10-14', compare: 'previous_period' }))
  expect(result.comparison).toMatchObject({ from: '2026-10-01', to: '2026-10-07',
    summary: { completedSets: 1, weightRepsKg: 500 }, delta: { completedSets: 0, weightRepsKg: 50 } })
  expect(result.units).toMatchObject({ weightKg: 'kg', reps: 'reps' })
  expect(analyticsOutput.parse(result)).toEqual(result)
})

it('skips empty sessions and splits changed measurement types inside the same historical plan', () => {
  const snapshot = trainingFixture()
  for (const s of snapshot.backup.tables.workoutSessions) s.plannedPlanId = 'same-plan'
  snapshot.backup.tables.performedExercises.find((e) => e.id === 'e-s5')!.measurementType = 'reps'
  const result = aggregateTraining(snapshot, query({ query: 'workout_summary', from: '2026-10-26', to: '2026-10-26' }))
  expect(result.items[0]).toMatchObject({ previous: { sessionId: 's3', date: '2026-10-22',
    removedExercises: expect.arrayContaining([expect.objectContaining({ exerciseKey: 'catalog:barbellBenchPress', measurementType: 'weightReps' })]) },
    exercises: [expect.objectContaining({ measurementType: 'reps', previous: null })] })
})

it('paginates sessions without dropping sets or changing full-range totals', () => {
  const snapshot = trainingFixture()
  const input = query({ query: 'workout_summary' })
  const full = aggregateTraining(snapshot, input)
  const collected: unknown[] = []
  let offset: number | null = 0
  while (offset !== null) {
    const page = aggregateTraining(snapshot, { ...input, offset, limit: 1 })
    expect(page.summary).toEqual(full.summary)
    expect(analyticsOutput.safeParse(page).success).toBe(true)
    collected.push(...page.items); offset = page.nextOffset
  }
  expect(collected).toEqual(full.items)
})

it('starts from the current version in a single request and requires that version for later pages', async () => {
  const paths: string[] = []
  const api = new ReprestApi('https://example.test', 'test', async (path) => {
    paths.push(String(path)); return Response.json(trainingFixture())
  })
  const input = analyticsInput.parse({ query: 'workout_summary', from: '2026-10-26', to: '2026-10-26' })
  const result = await queryTrainingAnalytics(api, input)
  expect(paths).toEqual(['https://example.test/api/account/data?view=training'])
  expect(result.version).toBe(7)
  expect(analyticsInput.safeParse({ ...input, offset: 1 }).success).toBe(false)
  expect(analyticsInput.safeParse({ ...input, offset: 1, version: 7 }).success).toBe(true)
})
