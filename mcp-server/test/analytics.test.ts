import { describe, expect, it } from 'vitest'
import { aggregateTraining } from '../src/analytics.js'
import { analyticsInput, analyticsOutput } from '../src/analytics-schema.js'
import { trainingFixture, query } from './analytics-fixture.js'
import catalog from '../src/catalog.json' with { type: 'json' }
import { exercises } from '../../src/domain/exercise-catalog/exercises.js'

describe('actual training aggregates', () => {
  it('packages exactly the authoritative application catalog without browser dependencies', () => {
    expect(catalog).toEqual(exercises.map(({ id, measurementType, muscleDistribution }) => ({ id, measurementType, muscleDistribution })))
  })
  it('counts actual sets rather than empty sessions, targets or cached completion counters', () => {
    const result = aggregateTraining(trainingFixture(), query())
    expect(result.summary).toMatchObject({ sessions: 3, trainingDays: 3, completedSets: 9, emptySessions: 1,
      planned: { items: 1, knownTargetSets: 20 } })
    expect(result).toMatchObject({ version: 7, syncedAt: '2026-10-26T12:00:00Z', schemaVersion: 1,
      exportedAt: '2026-10-26T11:59:00Z', status: 'ok' })
    expect(analyticsOutput.safeParse(result).success).toBe(true)
  })
  it('keeps five measurement types and load products separate, ignoring unrelated values', () => {
    expect(aggregateTraining(trainingFixture(), query()).summary).toMatchObject({
      reps: 55, durationSeconds: 90, distanceMeters: 1030, weightRepsKg: 1950, loadDistanceKgMeters: 600,
      observedSets: { reps: 6, durationSeconds: 1, distanceMeters: 2, weightRepsKg: 4, loadDistanceKgMeters: 1 },
    })
  })
  it('uses local training dates inclusively even when completion timestamps fall on a different UTC day', () => {
    const result = aggregateTraining(trainingFixture(), query({ from: '2026-10-22', to: '2026-10-22' }))
    expect(result.summary).toMatchObject({ sessions: 1, completedSets: 7 })
    expect(result.coverage).toMatchObject({ firstTrainingDate: '2026-09-30', lastTrainingDate: '2026-10-26' })
  })
  it('shows no recorded training for an empty planned workout or a date absent from the snapshot', () => {
    for (const date of ['2026-10-25', '2026-10-24']) {
      const result = aggregateTraining(trainingFixture(), query({ from: date, to: date }))
      expect(result.status).toBe('no_matching_data')
      expect(result.summary).toMatchObject({ sessions: 0, completedSets: 0, weightRepsKg: null })
      expect(result.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'SYNC_SNAPSHOT_ONLY' })]))
    }
  })
  it('paginates computed session summaries with stable ordering and global counts', () => {
    const snapshot = trainingFixture()
    const first = aggregateTraining(snapshot, query({ query: 'history', limit: 1 }))
    const second = aggregateTraining(snapshot, query({ query: 'history', limit: 1, offset: first.nextOffset! }))
    expect(first).toMatchObject({ total: 3, nextOffset: 1, summary: { completedSets: 9 } })
    expect(first.items[0]).toMatchObject({ sessionId: 's3', plannedPlanNameSnapshot: 'Historical plan', hasRecordedTraining: true })
    expect(second.items[0]).toMatchObject({ sessionId: 's2' })
    expect(aggregateTraining(snapshot, query({ query: 'history', offset: 99 }))).toMatchObject({ items: [], total: 3, nextOffset: null })
  })
  it('merges repeated catalog movements within a day but never drops their sets', () => {
    const result = aggregateTraining(trainingFixture(), query({ query: 'exercise_progress', exerciseKey: 'catalog:barbellBenchPress' }))
    expect(result.items).toHaveLength(3)
    expect(result.items[2]).toMatchObject({ date: '2026-10-22', completedSets: 2, weightRepsKg: 900, value: 60, delta: 10, changePercent: 20 })
    expect(result.items[2].best).toEqual(expect.arrayContaining([expect.objectContaining({ metric: 'weightKg', value: 60, unit: 'kg' })]))
  })
  it('matches normalized exact names without fuzzy or cross-identity merging', () => {
    const snapshot = trainingFixture()
    const result = aggregateTraining(snapshot, query({ query: 'exercise_progress', exerciseName: ' ＢＥＮＣＨ   PRESS ' }))
    expect(result.summary).toMatchObject({ completedSets: 4 })
    snapshot.backup.tables.performedExercises.push({ id: 'ambiguous', sessionId: 's3', name: 'bench press', catalogExerciseId: 'dumbbellBenchPress', measurementType: 'weightReps' })
    snapshot.backup.tables.setRecords.push({ id: 'ambiguous-set', sessionId: 's3', performedExerciseId: 'ambiguous', completedAt: '2026-10-22T10:00:00Z', weightKg: 20, reps: 10 })
    expect(() => aggregateTraining(snapshot, query({ query: 'exercise_progress', exerciseName: 'bench press' }))).toThrow(/multiple exercise identities/)
  })
  it('preserves null metrics rather than filling missing weight from plans/defaults', () => {
    const result = aggregateTraining(trainingFixture(), query({ query: 'personal_records', exerciseKey: 'name:incomplete bench' }))
    expect(result.summary).toMatchObject({ weightRepsKg: null, reps: 8 })
    expect(result.items[0].best).toEqual([expect.objectContaining({ metric: 'reps', value: 8 })])
    expect(result.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'MISSING_METRICS' })]))
  })
  it('reports known single-set personal records within the requested range with evidence IDs', () => {
    const result = aggregateTraining(trainingFixture(), query({ query: 'personal_records', exerciseKey: 'catalog:barbellBenchPress' }))
    expect(result.items[0].best).toEqual(expect.arrayContaining([
      expect.objectContaining({ metric: 'weightKg', value: 60, sessionId: 's3', sessionDateKey: '2026-10-22' }),
      expect.objectContaining({ metric: 'weightRepsKg', value: 600, setRecordId: 'r-s3' }),
    ]))
    expect(JSON.stringify(result.items)).not.toContain('300')
  })
  it('includes zero frequency buckets, marks partial weeks and computes day-gap variability', () => {
    const result = aggregateTraining(trainingFixture(), query({ query: 'frequency' }))
    expect(result.items.map((p) => [p.bucketStart, p.sessions, p.partial])).toEqual([
      ['2026-09-28', 1, true], ['2026-10-05', 1, false], ['2026-10-12', 0, false], ['2026-10-19', 1, false],
    ])
    expect(result.summary).toMatchObject({ meanGapDays: 10.5, gapStandardDeviationDays: 3.5, completeBuckets: 3 })
  })
  it('computes volume per calendar bucket and exercise with global pagination totals', () => {
    const result = aggregateTraining(trainingFixture(), query({ query: 'volume', exerciseKey: 'catalog:barbellBenchPress', limit: 2 }))
    expect(result).toMatchObject({ total: 3, nextOffset: 2, summary: { weightRepsKg: 1950 } })
    expect(result.items.map((p) => p.weightRepsKg)).toEqual([500, 550])
  })
  it('allocates muscle sets and metrics by catalog ratios, keeping unknown sets explicit', () => {
    const result = aggregateTraining(trainingFixture(), query({ query: 'muscle_distribution', bucket: 'month' }))
    const chest = result.items.find((p) => p.muscleGroup === 'chest')!
    expect(chest.weightedSets).toBeCloseTo(2.4)
    expect(chest.weightedMetrics).toMatchObject({ weightRepsKg: 1170 })
    expect(result.items.find((p) => p.muscleGroup === 'unknown')).toMatchObject({ weightedSets: 5 })
    expect(result.items.reduce((sum, p) => sum + Number(p.weightedSets), 0)).toBeCloseTo(9)
  })
  it('uses synced profile classifications, flags their time limitation and does not change historical measurement', () => {
    const snapshot = trainingFixture()
    snapshot.backup.tables.exerciseProfiles.push({ id: 'catalog:barbellBenchPress', measurementType: 'duration',
      muscleDistribution: [{ muscleGroupId: 'legs', ratio: 1 }] })
    const result = aggregateTraining(snapshot, query({ query: 'muscle_distribution', muscleGroup: 'legs', bucket: 'month' }))
    expect(result.summary).toMatchObject({ completedSets: 4, weightRepsKg: 1950, durationSeconds: null })
    expect(result.items[0]).toMatchObject({ muscleGroup: 'legs', weightedSets: 4, classificationSources: ['profile'] })
    expect(result.warnings.some((w) => w.code === 'PROFILE_CLASSIFICATION')).toBe(true)
  })
  it('treats an invalid distribution override as unknown without inventing normalization', () => {
    const snapshot = trainingFixture()
    snapshot.backup.tables.exerciseProfiles.push({ id: 'catalog:barbellBenchPress', muscleDistribution: [{ muscleGroupId: 'chest', ratio: 0.4 }] })
    const result = aggregateTraining(snapshot, query({ query: 'muscle_distribution', bucket: 'month' }))
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({ muscleGroup: 'unknown', weightedSets: 9 })
  })
  it('filters the latest actual session by muscle without using the plan name as evidence', () => {
    const result = aggregateTraining(trainingFixture(), query({ query: 'history', muscleGroup: 'chest', limit: 1 }))
    expect(result.items[0]).toMatchObject({ sessionId: 's3', completedSets: 2 })
    expect(aggregateTraining(trainingFixture(), query({ query: 'history', muscleGroup: 'legs' })).status).toBe('no_matching_data')
  })
  it('excludes broken links, invalid dates/times and duplicate primary IDs conservatively', () => {
    const snapshot = trainingFixture()
    const t = snapshot.backup.tables
    t.setRecords.push(
      { ...t.setRecords[0], id: 'orphan', sessionId: 'missing' },
      { ...t.setRecords[0], id: 'cross-session', sessionId: 's3' },
      { ...t.setRecords[0], id: 'invalid-time', completedAt: 'bad' },
      { ...t.setRecords[1] },
    )
    t.workoutSessions.push({ id: 'bad-date', sessionDateKey: '2026-02-30' })
    const result = aggregateTraining(snapshot, query())
    expect(result.summary).toMatchObject({ completedSets: 8, sessions: 2 })
    expect(result.warnings.map((w) => w.code)).toEqual(expect.arrayContaining(['BROKEN_LINKS', 'INVALID_ROWS', 'DUPLICATE_IDS']))
  })
  it('counts completion evidence with an unknown type without inferring metrics from populated fields', () => {
    const snapshot = trainingFixture()
    snapshot.backup.tables.performedExercises.find((e) => e.id === 'duration')!.measurementType = null
    const result = aggregateTraining(snapshot, query({ query: 'personal_records', exerciseKey: 'name:plank' }))
    expect(result.summary).toMatchObject({ completedSets: 1, durationSeconds: null })
    expect(result.items[0]).toMatchObject({ measurementType: 'unknown', best: [] })
  })
  it('uses historical source measurement before profile overrides and splits measurement changes', () => {
    const snapshot = trainingFixture()
    const bench = snapshot.backup.tables.performedExercises.find((e) => e.id === 'e-s1')!
    delete bench.measurementType
    delete bench.catalogExerciseId
    bench.sourcePlanSnapshot = { measurementType: 'weightReps', catalogExerciseId: 'barbellBenchPress' }
    snapshot.backup.tables.exerciseProfiles.push({ id: 'catalog:barbellBenchPress', measurementType: 'duration' })
    expect(aggregateTraining(snapshot, query({ query: 'overview' })).summary.weightRepsKg).toBe(1950)
    snapshot.backup.tables.performedExercises.find((e) => e.id === 'e-s2')!.measurementType = 'reps'
    const result = aggregateTraining(snapshot, query({ query: 'exercise_progress', exerciseKey: 'catalog:barbellBenchPress' }))
    expect(new Set(result.items.map((p) => p.measurementType))).toEqual(new Set(['weightReps', 'reps']))
    expect(result.items.find((p) => p.measurementType === 'reps')).toMatchObject({ value: 10, delta: null, sufficient: false })
  })
  it.each(['overview', 'history', 'exercise_progress', 'frequency', 'volume', 'muscle_distribution', 'personal_records', 'plateaus'] as const)(
    'validates the documented %s response schema with representative data', (kind) => {
      const snapshot = trainingFixture()
      for (const r of snapshot.backup.tables.setRecords) if (r.id === 'r-s1' || r.id === 'r-s2') r.weightKg = 60
      const result = aggregateTraining(snapshot, query({ query: kind, ...(kind === 'exercise_progress' ? { exerciseKey: 'catalog:barbellBenchPress' } : {}) }))
      expect(analyticsOutput.parse(result)).toEqual(result)
    },
  )
  it.each(['history', 'exercise_progress', 'frequency', 'volume', 'muscle_distribution', 'personal_records'] as const)(
    'paginates %s results after calculation without changing the summary or losing items', (kind) => {
      const snapshot = trainingFixture()
      const input = query({ query: kind, ...(kind === 'exercise_progress' ? { exerciseKey: 'catalog:barbellBenchPress' } : {}) })
      const full = aggregateTraining(snapshot, input)
      const items: unknown[] = []
      let offset: number | null = 0
      while (offset !== null) {
        const page = aggregateTraining(snapshot, { ...input, offset, limit: 1 })
        expect(page.summary).toEqual(full.summary)
        expect(page.total).toBe(full.total)
        items.push(...page.items)
        offset = page.nextOffset
      }
      expect(items).toEqual(full.items)
    },
  )
  it('preserves zero measurements and rejects negative, fractional reps and nonfinite metrics', () => {
    const snapshot = trainingFixture()
    Object.assign(snapshot.backup.tables.setRecords.find((r) => r.id === 'r-s1')!, { weightKg: 0, reps: 0 })
    Object.assign(snapshot.backup.tables.setRecords.find((r) => r.id === 'r-s2')!, { weightKg: -1, reps: 2.5 })
    Object.assign(snapshot.backup.tables.setRecords.find((r) => r.id === 'r-duration')!, { durationSeconds: Infinity })
    const result = aggregateTraining(snapshot, query({ query: 'exercise_progress', exerciseKey: 'catalog:barbellBenchPress' }))
    expect(result.items[0]).toMatchObject({ value: 0, weightRepsKg: 0, changePercent: null })
    expect(result.items[1]).toMatchObject({ value: null, weightRepsKg: null, reps: null })
  })
  it('uses stored kg even when the backup includes a pounds display preference', () => {
    const snapshot = trainingFixture()
    Object.assign(snapshot.backup, { localStorage: { 'trainre.weightUnitPreference': 'lb' } })
    snapshot.backup.tables.setRecords.find((r) => r.id === 'r-s1')!.weightKg = 100 * 0.45359237
    const result = aggregateTraining(snapshot, query({ from: '2026-10-01', to: '2026-10-01' }))
    expect(result.summary.weightRepsKg).toBeCloseTo(453.59237)
  })
  it('screens flat primary-metric performance only after sufficient days and observation span', () => {
    const snapshot = trainingFixture()
    for (const r of snapshot.backup.tables.setRecords) if (r.id === 'r-s1' || r.id === 'r-s2') r.weightKg = 60
    const result = aggregateTraining(snapshot, query({ query: 'plateaus' }))
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({ exerciseKey: 'catalog:barbellBenchPress', observedTrainingDays: 3, spanDays: 21, delta: 0 })
    expect(result.summary).toMatchObject({ eligibleSeries: 1 })
    expect(aggregateTraining(trainingFixture(), query({ query: 'plateaus' }))).toMatchObject({ status: 'ok', items: [] })
    expect(aggregateTraining(snapshot, query({ query: 'plateaus', minSpanDays: 22 })).status).toBe('insufficient_history')
  })
  it('reports sparse progress and frequency without claiming improvement or stability', () => {
    expect(aggregateTraining(trainingFixture(), query({ query: 'exercise_progress', exerciseKey: 'name:plank' }))).toMatchObject({
      status: 'insufficient_history', items: [expect.objectContaining({ delta: null, changePercent: null })],
    })
    expect(aggregateTraining(trainingFixture(), query({ query: 'frequency', from: '2026-10-22' })).status).toBe('insufficient_history')
  })
  it('handles year transitions, leap days and Monday weeks without relying on server timezone', () => {
    const snapshot = trainingFixture()
    snapshot.backup.tables.workoutSessions.find((s) => s.id === 's1')!.sessionDateKey = '2024-02-29'
    const leap = aggregateTraining(snapshot, query({ query: 'frequency', from: '2024-02-28', to: '2024-03-01', bucket: 'day' }))
    expect(leap.items.map((p) => [p.bucketStart, p.sessions])).toEqual([['2024-02-28', 0], ['2024-02-29', 1], ['2024-03-01', 0]])
    const year = aggregateTraining(snapshot, query({ query: 'frequency', from: '2025-12-31', to: '2026-01-01', bucket: 'month' }))
    expect(year.items.map((p) => p.bucketStart)).toEqual(['2025-12-01', '2026-01-01'])
  })
  it('rejects stale versions or absent sync metadata before reporting any success', () => {
    const snapshot = trainingFixture()
    expect(() => aggregateTraining(snapshot, query({ version: 6 }))).toThrow(/current program version/)
    snapshot.syncedAt = null
    expect(() => aggregateTraining(snapshot, query())).toThrow(/Sync in Represt/)
  })
  it.each([
    { from: '2026-02-30' }, { from: '2026-11-01' }, { from: '2000-01-01' }, { limit: 101 }, { offset: -1 },
    { query: 'exercise_progress' }, { exerciseKey: 'catalog:a', exerciseName: 'a' }, { userId: 'other-user' },
  ])('rejects invalid or unsafe input %j', (changes) => {
    expect(analyticsInput.safeParse({ query: 'overview', version: 7, from: '2026-10-01', to: '2026-10-25', ...changes }).success).toBe(false)
  })
})
