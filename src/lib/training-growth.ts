import type { MeasurementType } from '../domain/exercise-catalog'
import type { ExerciseRecordDetail } from '../db/exercise-records'
import { getActiveDurationSummary } from '../db/session-summary'
import { getExerciseProfileId } from '../db/exercise-records'
import { resolveCatalogExerciseId } from './exercise-name'
import { getSessionPlanColor } from './plan-color'
import { getSessionCompletionRatios, getTrainingCompletionColor } from './training-completion'
import { buildTrainingDurations } from './training-duration'
import { getMeasurementTypeForExercise, getSetRecordMeasurementType } from './set-record-measurement'
import { addDaysToSessionDateKey, diffSessionDateKeys, isSessionDateKey } from './session-date-key'
import type { ExerciseProfile, PerformedExercise, PlanExercise, SessionPlanItem, SetRecord, WorkoutPlan, WorkoutSession } from '../models/types'

export type GrowthPoint = { dateKey: string; value: number; record: SetRecord }
export type GrowthSeries = {
  id: string
  mode: MeasurementType
  reps: number | null
  side?: 'left' | 'right'
  points: GrowthPoint[]
}
export type GrowthExercise = {
  id: string; name: string; catalogExerciseId: string | null; displayNameOverride?: string
  latestDate: string | null; series: GrowthSeries[]
}
export type GrowthSnapshot = {
  sessions: WorkoutSession[]; exercises: PerformedExercise[]; records: SetRecord[]
  plans: PlanExercise[]; profiles: ExerciseProfile[]
  workoutPlans: WorkoutPlan[]
  sessionPlanItems: SessionPlanItem[]
}

export function isCompletedRecord(record: SetRecord) {
  return (record.status ?? 'completed') === 'completed'
}

function positive(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

// Compare exact repetition counts. Composite modes need more context than a single scalar.
function comparableValue(record: SetRecord, mode: MeasurementType) {
  if (mode === 'weightReps' && positive(record.reps) && Number.isInteger(record.reps) &&
      positive(record.weightKg)) return record.weightKg
  if (mode === 'reps' && positive(record.reps) && Number.isInteger(record.reps)) return record.reps
  if (mode === 'duration' && positive(record.durationSeconds)) return record.durationSeconds
  if (mode === 'distance' && positive(record.distanceMeters)) return record.distanceMeters
  return null
}

function comparableSamples(record: SetRecord, mode: MeasurementType) {
  if (mode === 'leftRightWeightReps') {
    return ([
      { side: 'left' as const, record },
      { side: 'right' as const, record: { ...record, weightKg: record.rightWeightKg ?? null, reps: record.rightReps ?? null } },
    ]).map((entry) => ({ side: entry.side, reps: entry.record.reps, value: comparableValue(entry.record, 'weightReps') }))
  }
  return [{ side: undefined, reps: mode === 'weightReps' ? record.reps : null, value: comparableValue(record, mode) }]
}

export function buildTrainingGrowth(snapshot: GrowthSnapshot, today: string) {
  const sessions = new Map(snapshot.sessions.filter((session) =>
    isSessionDateKey(session.sessionDateKey) && session.sessionDateKey <= today).map((session) => [session.id, session]))
  const performed = new Map(snapshot.exercises.map((exercise) => [exercise.id, exercise]))
  const profiles = new Map(snapshot.profiles.map((profile) => [profile.id, profile]))
  const groups = new Map<string, GrowthExercise>()
  const groupRecords = new Map<string, GrowthRecord[]>()
  const trainingDays = new Set<string>()
  const trainingDayColors = new Map<string, string>()
  const plans = new Map(snapshot.workoutPlans.map((plan) => [plan.id, plan]))
  const completionRatios = getSessionCompletionRatios(snapshot.sessionPlanItems, snapshot.exercises, snapshot.records)
  const recordsByDate = new Map<string, SetRecord[]>()
  const ensureGroup = (source: PerformedExercise | PlanExercise) => {
    const id = getExerciseProfileId(source)
    let group = groups.get(id)
    if (!group) {
      const profile = profiles.get(id)
      group = { id, name: source.name, catalogExerciseId: resolveCatalogExerciseId(source),
        displayNameOverride: profile?.name.trim() || undefined, latestDate: null, series: [] }
      groups.set(id, group)
    }
    return group
  }
  for (const plan of snapshot.plans) {
    if (!profiles.get(getExerciseProfileId(plan))?.deletedAt) ensureGroup(plan)
  }
  for (const record of snapshot.records) {
    const session = sessions.get(record.sessionId)
    const exercise = performed.get(record.performedExerciseId)
    if (!session || !exercise || exercise.sessionId !== session.id || !isCompletedRecord(record)) continue
    trainingDays.add(session.sessionDateKey)
    if (!trainingDayColors.has(session.sessionDateKey)) {
      const color = getSessionPlanColor(session, plans)?.solid ?? 'var(--on-surface-variant)'
      trainingDayColors.set(session.sessionDateKey, getTrainingCompletionColor(color, completionRatios.get(session.id) ?? 0))
    }
    if (Number.isFinite(Date.parse(record.completedAt))) {
      const records = recordsByDate.get(session.sessionDateKey) ?? []
      records.push(record)
      recordsByDate.set(session.sessionDateKey, records)
    }
    const group = ensureGroup(exercise)
    group.latestDate = group.latestDate && group.latestDate > session.sessionDateKey ? group.latestDate : session.sessionDateKey
    if ((record.kind ?? 'working') !== 'working') continue
    const records = groupRecords.get(group.id) ?? []
    records.push({ record, dateKey: session.sessionDateKey, fallbackMode: getMeasurementTypeForExercise(exercise) })
    groupRecords.set(group.id, records)
  }
  for (const group of groups.values()) {
    group.series = buildGrowthSeries(groupRecords.get(group.id) ?? [])
  }
  return { exercises: [...groups.values()].sort((a, b) => (b.latestDate ?? '').localeCompare(a.latestDate ?? '')),
    trainingDays: [...trainingDays].sort(), trainingDayColors,
    durationPoints: buildTrainingDurations(recordsByDate), todayTiming: getActiveDurationSummary(recordsByDate.get(today) ?? []) }
}

type GrowthRecord = { record: SetRecord; dateKey: string; fallbackMode: MeasurementType }

function buildGrowthSeries(records: GrowthRecord[]) {
  const seriesById = new Map<string, GrowthSeries>()
  const daysBySeries = new Map<string, Map<string, GrowthPoint>>()
  for (const { record, dateKey, fallbackMode } of records) {
    if (!isCompletedRecord(record) || (record.kind ?? 'working') !== 'working') continue
    const mode = getSetRecordMeasurementType(record, fallbackMode)
    for (const { value, reps, side } of comparableSamples(record, mode)) {
      if (value === null) continue
      const id = `${mode}:${reps ?? ''}:${side ?? ''}`
      if (!seriesById.has(id)) {
        seriesById.set(id, { id, mode, reps, side, points: [] })
        daysBySeries.set(id, new Map())
      }
      const days = daysBySeries.get(id)!
      const prior = days.get(dateKey)
      if (!prior || value > prior.value) days.set(dateKey, { dateKey, value, record })
    }
  }
  for (const series of seriesById.values()) {
    series.points = [...daysBySeries.get(series.id)!.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  }
  return [...seriesById.values()].sort((a, b) =>
    b.points.length - a.points.length || (b.reps ?? 0) - (a.reps ?? 0) || a.id.localeCompare(b.id))
}

export function growthFromExerciseDetail(detail: ExerciseRecordDetail, today: string): GrowthExercise {
  const history = detail.history.filter((item) =>
    isSessionDateKey(item.sessionDateKey) && item.sessionDateKey <= today && isCompletedRecord(item.setRecord))
  return {
    id: detail.profileId,
    name: detail.name,
    catalogExerciseId: detail.catalogExerciseId,
    displayNameOverride: detail.displayNameOverride ?? undefined,
    latestDate: history.map((item) => item.sessionDateKey).sort().at(-1) ?? null,
    series: buildGrowthSeries(history.map((item) => ({
      record: item.setRecord, dateKey: item.sessionDateKey, fallbackMode: detail.measurementType,
    }))),
  }
}

export function representativeExercises(exercises: GrowthExercise[], today: string) {
  return exercises.filter((exercise) => {
    const latest = exercise.series[0]?.points.at(-1)
    return latest && diffSessionDateKeys(today, latest.dateKey) <= 30
  }).sort((a, b) =>
    pointsInRange(b.series[0], today, 90).length - pointsInRange(a.series[0], today, 90).length ||
    b.series[0].points.at(-1)!.dateKey.localeCompare(a.series[0].points.at(-1)!.dateKey) || a.id.localeCompare(b.id)
  ).slice(0, 3)
}

export function pointsInRange(series: GrowthSeries, today: string, days: number) {
  const start = days ? addDaysToSessionDateKey(today, 1 - days) : ''
  return series.points.filter((point) => point.dateKey >= start && point.dateKey <= today)
}

function median(points: GrowthPoint[]) {
  const values = points.map((point) => point.value).sort((a, b) => a - b)
  return values[Math.floor(values.length / 2)]
}

export function compareGrowth(points: GrowthPoint[]) {
  // Two non-overlapping stages, each with three distinct training dates.
  if (points.length < 6) return null
  const previous = points.slice(-6, -3)
  const recent = points.slice(-3)
  return { previous: median(previous), recent: median(recent),
    previousStart: previous[0].dateKey, previousEnd: previous[2].dateKey,
    recentStart: recent[0].dateKey, recentEnd: recent[2].dateKey }
}

export function growthStatus(exercise: GrowthExercise, today: string) {
  if (!exercise.latestDate) return 'untrained'
  if (diffSessionDateKeys(today, exercise.latestDate) > 30) return 'away'
  const series = exercise.series[0]
  const latest = series?.points.at(-1)
  if (series && latest && series.points.length >= 3 && diffSessionDateKeys(today, latest.dateKey) <= 30 &&
      series.points.slice(0, -1).every((point) => latest.value > point.value)) return 'best'
  const comparison = series ? compareGrowth(pointsInRange(series, today, 90)) : null
  if (!comparison) return 'insufficient'
  if (comparison.recent > comparison.previous) return 'higher'
  if (comparison.recent < comparison.previous) return 'lower'
  return 'equal'
}

export function getTrainingHabit(trainingDays: string[], today: string) {
  const start = addDaysToSessionDateKey(today, -27)
  const recent = trainingDays.filter((date) => date >= start && date <= today)
  // Consecutive Monday-based weeks with at least one recorded completed set.
  const weekKeys = new Set(trainingDays.map((date) => {
    const weekday = new Date(`${date}T12:00:00`).getDay()
    return addDaysToSessionDateKey(date, -((weekday + 6) % 7))
  }))
  const weekday = new Date(`${today}T12:00:00`).getDay()
  let week = addDaysToSessionDateKey(today, -((weekday + 6) % 7))
  if (!weekKeys.has(week)) week = addDaysToSessionDateKey(week, -7)
  let consecutiveWeeks = 0
  while (weekKeys.has(week)) {
    consecutiveWeeks += 1
    week = addDaysToSessionDateKey(week, -7)
  }
  return { days: recent.length, weeklyAverage: recent.length / 4, consecutiveWeeks }
}

export function chartGrowthPoints(points: GrowthPoint[]) {
  if (points.length <= 180) return points
  const weeks = new Map<string, GrowthPoint>()
  for (const point of points) {
    const weekday = new Date(`${point.dateKey}T12:00:00`).getDay()
    const week = addDaysToSessionDateKey(point.dateKey, -((weekday + 6) % 7))
    const prior = weeks.get(week)
    if (!prior || point.value > prior.value) weeks.set(week, point)
  }
  return [...weeks.values()]
}
