import { expect, it, vi } from 'vitest'
import { compareTrainingDuration, getTrainingTimeDistribution, type TrainingDurationPoint } from '../src/lib/training-duration'
import { getTrainingTimeBucket } from '../src/db/summary-analytics'
import { getSessionCompletionRatios, getTrainingCompletionColor } from '../src/lib/training-completion'
import type { PerformedExercise, SessionPlanItem, SetRecord } from '../src/models/types'

vi.mock('../src/i18n', () => ({ default: { t: (key: string) => key } }))

function planItem(id: string): SessionPlanItem {
  return { id, sessionId: 'session', planExerciseId: null, name: id,
    targetSets: 2, restSeconds: 60, order: 0, createdAt: '' }
}
const exercise: PerformedExercise = {
  id: 'exercise', sessionId: 'session', planItemId: 'first', planExerciseId: null,
  name: 'Exercise', targetSets: 2, completedSets: 0, restSeconds: 60, order: 0,
  startedAt: '', lastCompletedAt: null, restEndsAt: null,
}
function setRecord(setNumber: number): SetRecord {
  return { id: `set-${setNumber}`, sessionId: 'session', performedExerciseId: exercise.id,
    setNumber, completedAt: '', weightKg: 50, reps: 8, durationSeconds: null, distanceMeters: null }
}

it('includes unstarted daily targets and caps each exercise so excess sets cannot mask missing work', () => {
  const items = [planItem('first'), planItem('unstarted')]
  const ratio = (records: SetRecord[]) => getSessionCompletionRatios(items, [exercise], records).get('session')
  expect(ratio([])).toBe(0)
  expect(ratio([setRecord(1)])).toBe(0.25)
  expect(ratio([setRecord(1), setRecord(2)])).toBe(0.5)
  expect(ratio([setRecord(1), setRecord(2), setRecord(3)])).toBe(0.5)
  expect(ratio([setRecord(1), { ...setRecord(1), id: 'duplicate' }])).toBe(0.25)
})

it('excludes warmup, skipped, incomplete and orphaned records and supports legacy daily data', () => {
  const records = [setRecord(1), { ...setRecord(2), kind: 'warmup' as const },
    { ...setRecord(3), status: 'skipped' as const }, { ...setRecord(4), status: 'incomplete' as const },
    { ...setRecord(5), performedExerciseId: 'orphan' }]
  expect(getSessionCompletionRatios([], [exercise], records).get('session')).toBe(0.5)
  expect(getSessionCompletionRatios([], [exercise], [setRecord(1), setRecord(2)]).get('session')).toBe(1)
  expect(getTrainingCompletionColor('var(--plan-2)', 0.25)).toContain('25%')
  expect(getTrainingCompletionColor('var(--plan-2)', 0.5)).toContain('50%')
  expect(getTrainingCompletionColor('var(--plan-2)', 1)).toBe('var(--plan-2)')
  expect(getTrainingCompletionColor('var(--plan-2)', 2)).toBe('var(--plan-2)')
})

function point(dateKey: string, minutes: number): TrainingDurationPoint {
  return { dateKey, minutes, recordCount: 3, segments: [] }
}
const previous = [point('2026-11-10', 50), point('2026-11-12', 60), point('2026-11-15', 70)]

it('compares today against recent positive-duration days with an explicit tolerance', () => {
  const compare = (minutes: number) => compareTrainingDuration([...previous, point('2026-11-17', minutes)], '2026-11-17')
  expect(compare(75)).toMatchObject({ baseline: 60, status: 'higher', sampleCount: 3 })
  expect(compare(55).status).toBe('similar')
  expect(compare(45).status).toBe('lower')
  expect(compare(0).status).toBe('insufficient')
})

it('requires three recent reference days and keeps today out of its baseline', () => {
  expect(compareTrainingDuration(previous, '2026-11-17').status).toBe('empty')
  expect(compareTrainingDuration([previous[0], point('2026-11-17', 100)], '2026-11-17').status).toBe('insufficient')
  expect(compareTrainingDuration([point('2020-01-01', 40), point('2026-11-17', 80)], '2026-11-17').baseline).toBeNull()
})

it('shares existing time-period boundaries and deduplicates multiple segments on each training day', () => {
  const first = point('2026-11-10', 60)
  first.segments = ['09:00', '10:30', '13:00'].map((time) => ({
    startedAt: `${first.dateKey}T${time}:00`, endedAt: `${first.dateKey}T${time}:00`, durationMinutes: 0,
  }))
  const second = point('2026-11-12', 50)
  second.segments = [{ startedAt: `${second.dateKey}T09:00:00`, endedAt: `${second.dateKey}T09:50:00`, durationMinutes: 50 }]
  const distribution = getTrainingTimeDistribution([first, second])
  expect(distribution.primary.map((item) => item.bucket)).toEqual(['morning'])
  expect(distribution.buckets.find((item) => item.bucket === 'morning')).toMatchObject({ count: 2, fraction: 1 })
  expect(distribution.buckets.find((item) => item.bucket === 'afternoon')).toMatchObject({ count: 1, fraction: 0.5 })
  const expected = ['lateNight', 'earlyMorning', 'morning', 'afternoon', 'evening']
  expect(['04:59', '05:00', '09:00', '12:00', '18:00'].map((time) => getTrainingTimeBucket(`2026-11-17T${time}:00`))).toEqual(expected)
  expect(getTrainingTimeDistribution([]).primary).toEqual([])
})
