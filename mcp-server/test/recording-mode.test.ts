import { expect, it } from 'vitest'
import { prepareFacts } from '../src/analytics-data.js'
import { bests, totals } from '../src/analytics-metrics.js'
import type { TrainingSnapshot } from '../src/analytics-schema.js'

it('uses per-set modes after a switch and counts both sides without doubling completed sets', () => {
  const snapshot: TrainingSnapshot = { version: 1, syncedAt: null, backup: {
    schemaVersion: 1, exportedAt: '2026-10-27T10:00:00Z', tables: {
      workoutSessions: [{ id: 'session', sessionDateKey: '2026-10-27' }],
      performedExercises: [{ id: 'exercise', sessionId: 'session', name: 'Custom', measurementType: 'duration' }],
      sessionPlanItems: [], exerciseProfiles: [],
      setRecords: [
        { id: 'weighted', measurementType: 'weightReps', weightKg: 20, reps: 10 },
        { id: 'sides', measurementType: 'leftRightWeightReps', weightKg: 25, reps: 8, rightWeightKg: 15, rightReps: 12 },
        { id: 'timed-reps', measurementType: 'durationReps', durationSeconds: 30, reps: 10 },
        { id: 'timed', measurementType: 'duration', durationSeconds: 45 },
      ].map((record) => ({ ...record, sessionId: 'session', performedExerciseId: 'exercise', completedAt: '2026-10-27T10:00:00Z' })),
    },
  } }
  const { facts, warnings } = prepareFacts(snapshot)
  expect(totals(facts)).toMatchObject({ completedSets: 4, reps: 40, durationSeconds: 75, weightRepsKg: 580 })
  expect(bests(facts)).toEqual(expect.arrayContaining([
    expect.objectContaining({ metric: 'weightKg', value: 40 }),
    expect.objectContaining({ metric: 'reps', value: 10 }),
    expect.objectContaining({ metric: 'weightRepsKg', value: 380 }),
  ]))
  expect(warnings.has('UNKNOWN_MEASUREMENT')).toBe(false)
})
