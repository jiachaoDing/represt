import { shiftDate } from '../src/analytics-metrics.js'

// Ten months of local training dates with realistic snapshots/defaults and stable identities.
export function performanceFixture() {
  const timestamp = '2026-10-26T12:00:00Z'
  const tables: Record<string, Array<Record<string, unknown>>> = {
    workoutPlans: [], planExercises: [], trainingCycles: [], workoutSessions: [], sessionPlanItems: [],
    performedExercises: [], setRecords: [], exerciseProfiles: [], sharedPlanRecords: [],
  }
  for (const planId of ['upper', 'lower']) {
    tables.workoutPlans.push({ id: planId, name: planId, createdAt: timestamp, updatedAt: timestamp })
    for (let e = 0; e < 6; e++) tables.planExercises.push({ id: `${planId}-${e}`, planId, name: `${planId} movement ${e}`,
      measurementType: e === 5 ? 'duration' : 'weightReps', targetSets: 3, restSeconds: 90, weightKg: e === 5 ? null : 60,
      reps: e === 5 ? null : 8, durationSeconds: e === 5 ? 60 : null, order: e })
  }
  for (let i = 0; i < 156; i++) {
    const id = `session-${i}`
    const date = shiftDate('2026-10-26', (i - 155) * 2)
    const planId = i % 2 ? 'upper' : 'lower'
    tables.workoutSessions.push({ id, sessionDateKey: date, createdAt: `${date}T10:00:00+08:00`,
      plannedPlanId: planId, plannedPlanNameSnapshot: planId })
    for (let e = 0; e < 6; e++) {
      const planExerciseId = `${planId}-${e}`
      const item = { id: `${id}-item-${e}`, sessionId: id, planExerciseId, sourcePlanId: planId,
        name: `${planId} movement ${e}`, measurementType: e === 5 ? 'duration' : 'weightReps',
        targetSets: 3, defaultWeightKg: e === 5 ? null : 60, defaultReps: e === 5 ? null : 8,
        defaultDurationSeconds: e === 5 ? 60 : null, defaultDistanceMeters: null, restSeconds: 90, order: e }
      tables.sessionPlanItems.push({ ...item, createdAt: timestamp })
      const performedId = `${id}-performed-${e}`
      tables.performedExercises.push({ ...item, id: performedId, planItemId: item.id, sourcePlanSnapshot: item,
        completedSets: 3, startedAt: timestamp, lastCompletedAt: timestamp, restEndsAt: null })
      // Latest workout has an extra first-exercise set and a missing second-exercise set.
      const count = i === 155 ? e === 0 ? 4 : e === 1 ? 2 : 3 : 3
      for (let s = 1; s <= count; s++) tables.setRecords.push({ id: `${performedId}-set-${s}`, sessionId: id,
        performedExerciseId: performedId, setNumber: s, completedAt: `${date}T10:${String(e * 5 + s).padStart(2, '0')}:00+08:00`,
        weightKg: e === 5 ? null : 40 + Math.floor(i / 20) * 2.5 + e * 5,
        reps: e === 5 ? null : 8, durationSeconds: e === 5 ? 60 : null, distanceMeters: null })
    }
  }
  return { app: 'represt', schemaVersion: 1, exportedAt: timestamp,
    localStorage: { 'trainre.weightUnitPreference': 'kg', 'trainre.themePreference': 'dark' }, tables }
}
