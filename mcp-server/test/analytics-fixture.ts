import { analyticsInput, type AnalyticsInput, type TrainingSnapshot } from '../src/analytics-schema.js'

export function trainingFixture(): TrainingSnapshot {
  const completedAt = '2026-10-25T23:59:59-07:00'
  const snapshot: TrainingSnapshot = { version: 7, syncedAt: '2026-10-26T12:00:00Z', backup: {
    schemaVersion: 1, exportedAt: '2026-10-26T11:59:00Z', tables: {
      workoutSessions: ['2026-09-30', '2026-10-01', '2026-10-08', '2026-10-22', '2026-10-25', '2026-10-26']
        .map((sessionDateKey, i) => ({ id: `s${i}`, sessionDateKey, plannedPlanNameSnapshot: 'Historical plan' })),
      sessionPlanItems: [{ id: 'planned', sessionId: 's4', targetSets: 20 }],
      performedExercises: [], setRecords: [], exerciseProfiles: [],
    },
  } }
  const t = snapshot.backup.tables
  for (const [sessionId, weightKg] of [['s0', 200], ['s1', 50], ['s2', 55], ['s3', 60], ['s5', 300]] as const) {
    t.performedExercises.push({ id: `e-${sessionId}`, sessionId, name: 'Bench Press', catalogExerciseId: 'barbellBenchPress',
      measurementType: 'weightReps', completedSets: 999, defaultWeightKg: 999, sourcePlanSnapshot: { name: 'Old bench', defaultWeightKg: 999 } })
    t.setRecords.push({ id: `r-${sessionId}`, sessionId, performedExerciseId: `e-${sessionId}`, completedAt, weightKg, reps: 10 })
  }
  const extra = [
    { id: 'bench-repeat', name: 'Bench renamed', catalogExerciseId: 'barbellBenchPress', measurementType: 'weightReps', weightKg: 60, reps: 5 },
    { id: 'bodyweight', name: 'Pushup', measurementType: 'reps', reps: 12, weightKg: 888 },
    { id: 'duration', name: 'Plank', measurementType: 'duration', durationSeconds: 90, reps: 888 },
    { id: 'distance', name: 'Run', measurementType: 'distance', distanceMeters: 1000, durationSeconds: 888 },
    { id: 'carry', name: 'Carry', measurementType: 'weightDistance', weightKg: 20, distanceMeters: 30 },
    { id: 'missing', name: 'Incomplete bench', measurementType: 'weightReps', weightKg: null, reps: 8, defaultWeightKg: 999 },
  ]
  for (const { weightKg, reps, durationSeconds, distanceMeters, ...e } of extra as Array<Record<string, unknown> & { id: string }>) {
    t.performedExercises.push({ ...e, sessionId: 's3' })
    t.setRecords.push({ id: `r-${e.id}`, sessionId: 's3', performedExerciseId: e.id, completedAt,
      weightKg, reps, durationSeconds, distanceMeters })
  }
  return snapshot
}
export const query = (changes: Partial<AnalyticsInput> = {}) => analyticsInput.parse({
  query: 'overview', version: 7, from: '2026-10-01', to: '2026-10-25', ...changes,
})
