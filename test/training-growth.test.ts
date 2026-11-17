import 'fake-indexeddb/auto'
import { expect, it, vi } from 'vitest'
import { buildTrainingGrowth, chartGrowthPoints, compareGrowth, getTrainingHabit, growthFromExerciseDetail, growthStatus, pointsInRange, representativeExercises } from '../src/lib/training-growth'
import type { GrowthPoint, GrowthSnapshot } from '../src/lib/training-growth'
import { addDaysToSessionDateKey } from '../src/lib/session-date-key'
import type { PerformedExercise, SetRecord } from '../src/models/types'
import { db } from '../src/db/app-db'
import { getSummaryTrainingHeatmap } from '../src/db/summary-heatmap'
import { getExerciseRecordDetail } from '../src/db/exercise-records'
import { getTemplateColor } from '../src/lib/plan-color'
import { getTrainingCompletionColor } from '../src/lib/training-completion'

vi.mock('../src/i18n', () => ({ default: { t: (key: string) => key } }))

const today = '2026-11-17'

function fixture(): GrowthSnapshot {
  const sessions = Array.from({ length: 6 }, (_, index) => ({
    id: `s${index}`, sessionDateKey: `2026-11-${String(index + 1).padStart(2, '0')}`, createdAt: '',
  }))
  const exercises: PerformedExercise[] = sessions.map((session, index) => ({
    id: `e${index}`, sessionId: session.id, name: 'Custom press', measurementType: 'weightReps',
    planItemId: null, planExerciseId: null, targetSets: 3, completedSets: 1, restSeconds: 60,
    order: 0, startedAt: '', lastCompletedAt: null, restEndsAt: null,
  }))
  const records: SetRecord[] = exercises.map((exercise, index) => ({
    id: `r${index}`, sessionId: exercise.sessionId, performedExerciseId: exercise.id,
    setNumber: 1, completedAt: '', weightKg: [40, 50, 45, 55, 60, 55][index],
    reps: 8, durationSeconds: null, distanceMeters: null,
  }))
  return { sessions, exercises, records, plans: [], profiles: [], workoutPlans: [], sessionPlanItems: [] }
}

it('compares daily best working sets at equal reps using stage medians', () => {
  const data = fixture()
  data.records.push({ ...data.records[0], id: 'second-set', weightKg: 42 })
  const growth = buildTrainingGrowth(data, today)
  const exercise = growth.exercises[0]
  expect(exercise.series[0].points.map((point) => point.value)).toEqual([42, 50, 45, 55, 60, 55])
  expect(compareGrowth(exercise.series[0].points)).toMatchObject({ previous: 45, recent: 55 })
  expect(growthStatus(exercise, today)).toBe('higher')
  expect(growth.trainingDays).toHaveLength(6)
})

it('separates rep counts and recording modes, filtering invalid and unfinished records', () => {
  const data = fixture()
  data.records[0].reps = 5
  data.records[1].kind = 'warmup'
  data.records[2].status = 'skipped'
  data.records[3].status = 'incomplete'
  data.records[4].weightKg = Number.NaN
  data.records[5].measurementType = 'reps'
  const growth = buildTrainingGrowth(data, today)
  expect(growth.trainingDays).toHaveLength(4)
  expect(growth.exercises[0].series.map((series) => series.mode).sort()).toEqual(['reps', 'weightReps'])
  expect(compareGrowth(growth.exercises[0].series[0].points)).toBeNull()
})

it('handles empty, orphaned, future, stale and untrained data', () => {
  expect(buildTrainingGrowth({ sessions: [], exercises: [], records: [], plans: [], profiles: [], workoutPlans: [], sessionPlanItems: [] }, today).exercises).toEqual([])
  const data = fixture()
  data.sessions[0].sessionDateKey = '2027-01-01'
  data.records[1].performedExerciseId = 'missing'
  const growth = buildTrainingGrowth(data, today)
  expect(growth.trainingDays).toHaveLength(4)
  expect(growthStatus(growth.exercises[0], '2027-01-01')).toBe('away')
  expect(growthStatus({ ...growth.exercises[0], latestDate: null }, today)).toBe('untrained')
  expect(pointsInRange(growth.exercises[0].series[0], today, 10)).toEqual([])
})

it('keeps bilateral sides separate from ordinary weighted records', () => {
  const data = fixture()
  data.records[0] = { ...data.records[0], measurementType: 'leftRightWeightReps', rightWeightKg: 20, rightReps: 10 }
  const series = buildTrainingGrowth(data, today).exercises[0].series
  expect(series.find((item) => item.side === 'left')?.points[0].value).toBe(40)
  expect(series.find((item) => item.side === 'right')?.reps).toBe(10)
  expect(series.find((item) => item.side === 'right')?.points[0].value).toBe(20)
  expect(series.find((item) => item.mode === 'weightReps')?.points).toHaveLength(5)
})

it('requires earlier dates for a new record best', () => {
  const data = fixture()
  data.records[5].weightKg = 65
  expect(growthStatus(buildTrainingGrowth(data, today).exercises[0], today)).toBe('best')
  data.records = data.records.slice(-1)
  expect(growthStatus(buildTrainingGrowth(data, today).exercises[0], today)).toBe('insufficient')
})

it('features at most three recent recorded exercises without padding with empty or stale entries', () => {
  const source = buildTrainingGrowth(fixture(), today).exercises[0]
  const candidates = Array.from({ length: 5 }, (_, index) => ({ ...source, id: `exercise-${index}` }))
  const empty = { ...source, id: 'empty', series: [] }
  const stale = { ...source, id: 'stale', series: source.series.map((series) => ({
    ...series, points: series.points.map((point) => ({ ...point, dateKey: '2020-01-01' })),
  })) }
  expect(representativeExercises([...candidates, empty, stale], today)).toHaveLength(3)
  expect(representativeExercises([source, empty, stale], today).map((item) => item.id)).toEqual([source.id])
})

it('counts 28-day frequency and consecutive active weeks across a year boundary', () => {
  expect(getTrainingHabit(['2025-12-22', '2025-12-30', '2026-01-04'], '2026-01-05')).toEqual({
    days: 3, weeklyAverage: 0.75, consecutiveWeeks: 2,
  })
  expect(getTrainingHabit([], today).consecutiveWeeks).toBe(0)
})

it('matches plan-page colors for current and deleted plans, with a neutral manual-training fallback', () => {
  const data = fixture()
  const plan = { id: 'upper', name: '上肢训练', createdAt: '', updatedAt: '' }
  data.workoutPlans = [plan]
  data.sessions[0].plannedPlanId = plan.id
  data.sessions[0].plannedPlanNameSnapshot = 'Old name'
  data.sessions[1].plannedPlanId = 'deleted'
  data.sessions[1].plannedPlanNameSnapshot = '下肢训练'
  const colors = buildTrainingGrowth(data, today).trainingDayColors
  expect(colors.get('2026-11-01')).toBe(getTrainingCompletionColor(getTemplateColor(plan).solid, 1 / 3))
  expect(colors.get('2026-11-02')).toBe(getTrainingCompletionColor(getTemplateColor({ id: 'deleted', name: '下肢训练' }).solid, 1 / 3))
  expect(colors.get('2026-11-03')).toBe(getTrainingCompletionColor('var(--on-surface-variant)', 1 / 3))
})

it('reuses training segments for today and excludes hour-long breaks and unfinished sets', () => {
  const data = fixture()
  data.sessions.forEach((session) => { session.sessionDateKey = today })
  const timestamps = ['08:00', '08:30', '12:00', '12:20', '13:00', '14:00']
  data.records.forEach((record, index) => { record.completedAt = `${today}T${timestamps[index]}:00` })
  data.records[4].status = 'skipped'
  data.records[5].status = 'incomplete'
  const timing = buildTrainingGrowth(data, today).todayTiming
  expect(timing.activeDurationMinutes).toBe(50)
  expect(timing.trainingTimeSegments.map((segment) => segment.durationMinutes)).toEqual([30, 20])
  expect(timing.startedAtFromFirstSet).toBe(`${today}T08:00:00`)
  expect(timing.endedAtFromLastSet).toBe(`${today}T12:20:00`)
  expect(buildTrainingGrowth(fixture(), today).todayTiming.activeDurationMinutes).toBeNull()
})

it('reduces long chart series to weekly bests without changing source records', () => {
  const record = fixture().records[0]
  const points: GrowthPoint[] = Array.from({ length: 1000 }, (_, index) => ({
    dateKey: addDaysToSessionDateKey('2020-01-01', index), value: index, record,
  }))
  const chart = chartGrowthPoints(points)
  expect(chart.length).toBeLessThan(150)
  expect(chart.at(-1)?.value).toBe(999)
  expect(points).toHaveLength(1000)
})

it('counts completed records in the heatmap and excludes unfinished or orphaned sets', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null })
  try {
    await db.open()
    await Promise.all([db.workoutSessions.clear(), db.performedExercises.clear(), db.setRecords.clear(), db.sessionPlanItems.clear()])
    const data = fixture()
    data.sessions.forEach((session, index) => { session.sessionDateKey = `2025-01-0${index + 1}` })
    data.records[1].status = 'skipped'
    data.records[2].status = 'incomplete'
    data.records[3].performedExerciseId = 'orphan'
    data.exercises[0].planItemId = 'first'
    data.sessionPlanItems = ['first', 'unstarted'].map((id) => ({
      id, sessionId: data.sessions[0].id, planExerciseId: null, name: id,
      targetSets: 3, restSeconds: 60, order: 0, createdAt: '',
    }))
    await db.workoutSessions.bulkPut(data.sessions)
    await db.performedExercises.bulkPut(data.exercises)
    await db.setRecords.bulkPut(data.records)
    await db.sessionPlanItems.bulkPut(data.sessionPlanItems)
    const heatmap = await getSummaryTrainingHeatmap('2025-01-20')
    expect(heatmap.totalCompletedSets).toBe(3)
    expect(heatmap.days.filter((day) => day.completedSets > 0)).toHaveLength(3)
    const firstDay = heatmap.days.find((day) => day.dateKey === '2025-01-01')!
    expect(firstDay.completionRatio).toBe(1 / 6)
    expect(firstDay.planColor).toBe(buildTrainingGrowth(data, today).trainingDayColors.get(firstDay.dateKey))
    const detail = await getExerciseRecordDetail('name:custom press')
    expect(detail).not.toBeNull()
    expect(growthFromExerciseDetail(detail!, today).series).toMatchObject(buildTrainingGrowth(data, today).exercises[0].series)
  } finally {
    vi.unstubAllGlobals()
  }
})
