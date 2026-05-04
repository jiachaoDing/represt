import {
  exercises,
  type MeasurementType,
  type MuscleDistributionItem,
  type MuscleGroup,
} from '../domain/exercise-catalog'
import { resolveCatalogExerciseId } from '../lib/exercise-name'
import { addDaysToSessionDateKey, parseSessionDateKey } from '../lib/session-date-key'
import type { PerformedExercise, SetRecord, WorkoutSession } from '../models/types'
import { db } from './app-db'

export type SummaryRange = 'day' | 'week' | 'month'

export type SummaryMetricKind =
  | 'highestWeight'
  | 'maxReps'
  | 'longestDuration'
  | 'longestDistance'
  | 'weightRepsVolume'
  | 'loadDistanceVolume'

export type SummaryRecordHighlight = {
  id: string
  catalogExerciseId: string | null
  completedAt: string
  exerciseName: string
  metricKind: SummaryMetricKind
  type: 'first' | 'pr'
  value: number
}

export type SummaryTrendPoint = {
  key: string
  label: string
  value: number
}

export type SummaryMuscleDistributionItem = {
  muscleGroup: MuscleGroup | 'other'
  percentage: number
  setCount: number
}

export type SummaryExerciseTrend = {
  catalogExerciseId: string | null
  exerciseName: string
  metricKind: SummaryMetricKind
  points: SummaryTrendPoint[]
}

export type SummaryRangeAnalytics = {
  completedSets: number
  distribution: SummaryMuscleDistributionItem[]
  endDateKey: string
  exerciseCount: number
  highlights: SummaryRecordHighlight[]
  range: SummaryRange
  startDateKey: string
  totalDistanceMeters: number
  totalDurationSeconds: number
  totalReps: number
  totalWeightRepsVolume: number
  trainingDays: number
  trendPoints: SummaryTrendPoint[]
  topExerciseTrend: SummaryExerciseTrend | null
}

const catalogExercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]))

function dateToSessionDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function compareDateKeys(left: string, right: string) {
  return left.localeCompare(right)
}

export function getSummaryRangeBounds(dateKey: string, range: SummaryRange) {
  if (range === 'day') {
    return { startDateKey: dateKey, endDateKey: dateKey }
  }

  const date = parseSessionDateKey(dateKey) ?? new Date()

  if (range === 'week') {
    const day = date.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const start = new Date(date)
    start.setDate(date.getDate() + mondayOffset)

    return {
      startDateKey: dateToSessionDateKey(start),
      endDateKey: addDaysToSessionDateKey(dateToSessionDateKey(start), 6),
    }
  }

  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)

  return {
    startDateKey: dateToSessionDateKey(start),
    endDateKey: dateToSessionDateKey(end),
  }
}

function isDateKeyInRange(dateKey: string, startDateKey: string, endDateKey: string) {
  return compareDateKeys(dateKey, startDateKey) >= 0 && compareDateKeys(dateKey, endDateKey) <= 0
}

function getExerciseIdentity(exercise: Pick<PerformedExercise, 'catalogExerciseId' | 'id' | 'name'>) {
  const catalogExerciseId = resolveCatalogExerciseId(exercise)
  if (catalogExerciseId) {
    return `catalog:${catalogExerciseId}`
  }

  const normalizedName = exercise.name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
  return normalizedName ? `name:${normalizedName}` : `exercise:${exercise.id}`
}

function getExerciseMeasurementType(exercise: Pick<PerformedExercise, 'catalogExerciseId' | 'name'>): MeasurementType {
  const catalogExerciseId = resolveCatalogExerciseId(exercise)
  return catalogExerciseId ? catalogExercisesById.get(catalogExerciseId)?.measurementType ?? 'weightReps' : 'weightReps'
}

function getExerciseMuscleDistribution(
  exercise: Pick<PerformedExercise, 'catalogExerciseId' | 'name'>,
): MuscleDistributionItem[] | null {
  const catalogExerciseId = resolveCatalogExerciseId(exercise)
  return catalogExerciseId ? catalogExercisesById.get(catalogExerciseId)?.muscleDistribution ?? null : null
}

function getMetricValues(setRecord: SetRecord, measurementType: MeasurementType) {
  const values: { kind: SummaryMetricKind; value: number }[] = []

  if ((measurementType === 'weightReps' || measurementType === 'weightDistance') && setRecord.weightKg !== null) {
    values.push({ kind: 'highestWeight', value: setRecord.weightKg })
  }

  if ((measurementType === 'weightReps' || measurementType === 'reps') && setRecord.reps !== null) {
    values.push({ kind: 'maxReps', value: setRecord.reps })
  }

  if (measurementType === 'duration' && setRecord.durationSeconds !== null) {
    values.push({ kind: 'longestDuration', value: setRecord.durationSeconds })
  }

  if ((measurementType === 'distance' || measurementType === 'weightDistance') && setRecord.distanceMeters !== null) {
    values.push({ kind: 'longestDistance', value: setRecord.distanceMeters })
  }

  if (measurementType === 'weightReps' && setRecord.weightKg !== null && setRecord.reps !== null) {
    values.push({ kind: 'weightRepsVolume', value: setRecord.weightKg * setRecord.reps })
  }

  if (measurementType === 'weightDistance' && setRecord.weightKg !== null && setRecord.distanceMeters !== null) {
    values.push({ kind: 'loadDistanceVolume', value: setRecord.weightKg * setRecord.distanceMeters })
  }

  return values
}

function metricPriority(kind: SummaryMetricKind) {
  if (kind === 'highestWeight') {
    return 0
  }
  if (kind === 'maxReps') {
    return 1
  }
  if (kind === 'longestDuration' || kind === 'longestDistance') {
    return 2
  }
  return 3
}

function buildHighlights(input: {
  performedExercisesById: Map<string, PerformedExercise>
  periodRecordIds: Set<string>
  setRecords: SetRecord[]
}) {
  const bestValuesByExercise = new Map<string, Map<SummaryMetricKind, number>>()
  const highlights: SummaryRecordHighlight[] = []
  const sortedRecords = [...input.setRecords].sort((left, right) =>
    left.completedAt.localeCompare(right.completedAt),
  )

  for (const setRecord of sortedRecords) {
    const exercise = input.performedExercisesById.get(setRecord.performedExerciseId)
    if (!exercise) {
      continue
    }

    const exerciseKey = getExerciseIdentity(exercise)
    const measurementType = getExerciseMeasurementType(exercise)
    const metricValues = getMetricValues(setRecord, measurementType)
    const bestValues = bestValuesByExercise.get(exerciseKey) ?? new Map<SummaryMetricKind, number>()

    for (const metric of metricValues) {
      const previousBest = bestValues.get(metric.kind)

      if (input.periodRecordIds.has(setRecord.id)) {
        if (previousBest === undefined) {
          highlights.push({
            id: `${setRecord.id}:${metric.kind}`,
            catalogExerciseId: resolveCatalogExerciseId(exercise),
            completedAt: setRecord.completedAt,
            exerciseName: exercise.name,
            metricKind: metric.kind,
            type: 'first',
            value: metric.value,
          })
        } else if (metric.value > previousBest) {
          highlights.push({
            id: `${setRecord.id}:${metric.kind}`,
            catalogExerciseId: resolveCatalogExerciseId(exercise),
            completedAt: setRecord.completedAt,
            exerciseName: exercise.name,
            metricKind: metric.kind,
            type: 'pr',
            value: metric.value,
          })
        }
      }

      if (previousBest === undefined || metric.value > previousBest) {
        bestValues.set(metric.kind, metric.value)
      }
    }

    bestValuesByExercise.set(exerciseKey, bestValues)
  }

  return highlights
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'pr' ? -1 : 1
      }

      const priorityDelta = metricPriority(left.metricKind) - metricPriority(right.metricKind)
      return priorityDelta === 0 ? right.completedAt.localeCompare(left.completedAt) : priorityDelta
    })
    .slice(0, 3)
}

function buildRangeTrendPoints(input: {
  endDateKey: string
  range: SummaryRange
  records: SetRecord[]
  sessionsById: Map<string, WorkoutSession>
  startDateKey: string
}) {
  if (input.range === 'day') {
    return [] satisfies SummaryTrendPoint[]
  }

  if (input.range === 'week') {
    return Array.from({ length: 7 }, (_, index) => {
      const dateKey = addDaysToSessionDateKey(input.startDateKey, index)
      const value = input.records.filter((record) => input.sessionsById.get(record.sessionId)?.sessionDateKey === dateKey).length

      return {
        key: dateKey,
        label: dateKey.slice(5),
        value,
      } satisfies SummaryTrendPoint
    })
  }

  const weekKeys = new Map<string, { label: string; value: number }>()

  for (const record of input.records) {
    const dateKey = input.sessionsById.get(record.sessionId)?.sessionDateKey
    if (!dateKey) {
      continue
    }

    const bounds = getSummaryRangeBounds(dateKey, 'week')
    const current = weekKeys.get(bounds.startDateKey) ?? {
      label: `${weekKeys.size + 1}`,
      value: 0,
    }
    current.value += 1
    weekKeys.set(bounds.startDateKey, current)
  }

  return Array.from(weekKeys.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, point]) => ({ key, label: point.label, value: point.value }))
}

function buildDistribution(input: {
  performedExercisesById: Map<string, PerformedExercise>
  records: SetRecord[]
}) {
  const counts = new Map<MuscleGroup | 'other', number>()

  for (const record of input.records) {
    const exercise = input.performedExercisesById.get(record.performedExerciseId)
    const muscleDistribution = exercise ? getExerciseMuscleDistribution(exercise) : null

    if (!muscleDistribution || muscleDistribution.length === 0) {
      counts.set('other', (counts.get('other') ?? 0) + 1)
      continue
    }

    for (const item of muscleDistribution) {
      counts.set(item.muscleGroupId, (counts.get(item.muscleGroupId) ?? 0) + item.ratio)
    }
  }

  const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0)
  if (total === 0) {
    return []
  }

  return Array.from(counts.entries())
    .map(([muscleGroup, setCount]) => ({
      muscleGroup,
      percentage: Math.round((setCount / total) * 100),
      setCount,
    }))
    .sort((left, right) => right.setCount - left.setCount)
}

function pickTrendMetric(measurementType: MeasurementType): SummaryMetricKind {
  if (measurementType === 'reps') {
    return 'maxReps'
  }
  if (measurementType === 'duration') {
    return 'longestDuration'
  }
  if (measurementType === 'distance') {
    return 'longestDistance'
  }
  if (measurementType === 'weightDistance') {
    return 'loadDistanceVolume'
  }
  return 'highestWeight'
}

function buildTopExerciseTrend(input: {
  performedExercisesById: Map<string, PerformedExercise>
  records: SetRecord[]
  sessionsById: Map<string, WorkoutSession>
}) {
  const groups = new Map<string, { exercise: PerformedExercise; records: SetRecord[] }>()

  for (const record of input.records) {
    const exercise = input.performedExercisesById.get(record.performedExerciseId)
    if (!exercise) {
      continue
    }

    const key = getExerciseIdentity(exercise)
    const current = groups.get(key) ?? { exercise, records: [] }
    current.records.push(record)
    groups.set(key, current)
  }

  const candidates = Array.from(groups.values())
    .map((group) => {
      const measurementType = getExerciseMeasurementType(group.exercise)
      const metricKind = pickTrendMetric(measurementType)
      const pointsByDate = new Map<string, number>()

      for (const record of group.records) {
        const dateKey = input.sessionsById.get(record.sessionId)?.sessionDateKey
        const value = getMetricValues(record, measurementType).find((metric) => metric.kind === metricKind)?.value
        if (!dateKey || value === undefined) {
          continue
        }

        const current = pointsByDate.get(dateKey)
        if (current === undefined || value > current) {
          pointsByDate.set(dateKey, value)
        }
      }

      return {
        catalogExerciseId: resolveCatalogExerciseId(group.exercise),
        exerciseName: group.exercise.name,
        metricKind,
        points: Array.from(pointsByDate.entries())
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, value]) => ({ key, label: key.slice(5), value })),
      }
    })
    .filter((candidate) => candidate.points.length >= 2)
    .sort((left, right) => right.points.length - left.points.length)

  return candidates[0] ?? null
}

export async function getSummaryRangeAnalytics(dateKey: string, range: SummaryRange) {
  const { startDateKey, endDateKey } = getSummaryRangeBounds(dateKey, range)
  const [sessions, performedExercises, allSetRecords] = await Promise.all([
    db.workoutSessions.toArray(),
    db.performedExercises.toArray(),
    db.setRecords.orderBy('completedAt').toArray(),
  ])
  const sessionsById = new Map(sessions.map((session) => [session.id, session]))
  const performedExercisesById = new Map(performedExercises.map((exercise) => [exercise.id, exercise]))
  const periodRecords = allSetRecords.filter((record) => {
    const sessionDateKey = sessionsById.get(record.sessionId)?.sessionDateKey
    return sessionDateKey ? isDateKeyInRange(sessionDateKey, startDateKey, endDateKey) : false
  })
  const periodRecordIds = new Set(periodRecords.map((record) => record.id))
  const trainingDateKeys = new Set<string>()
  const exerciseKeys = new Set<string>()
  let totalDistanceMeters = 0
  let totalDurationSeconds = 0
  let totalReps = 0
  let totalWeightRepsVolume = 0

  for (const record of periodRecords) {
    const session = sessionsById.get(record.sessionId)
    const exercise = performedExercisesById.get(record.performedExerciseId)
    if (session) {
      trainingDateKeys.add(session.sessionDateKey)
    }
    if (!exercise) {
      continue
    }

    const measurementType = getExerciseMeasurementType(exercise)
    exerciseKeys.add(getExerciseIdentity(exercise))

    if (measurementType === 'weightReps' && record.weightKg !== null && record.reps !== null) {
      totalWeightRepsVolume += record.weightKg * record.reps
    }
    if ((measurementType === 'weightReps' || measurementType === 'reps') && record.reps !== null) {
      totalReps += record.reps
    }
    if (measurementType === 'duration' && record.durationSeconds !== null) {
      totalDurationSeconds += record.durationSeconds
    }
    if ((measurementType === 'distance' || measurementType === 'weightDistance') && record.distanceMeters !== null) {
      totalDistanceMeters += record.distanceMeters
    }
  }

  return {
    completedSets: periodRecords.length,
    distribution: buildDistribution({ performedExercisesById, records: periodRecords }),
    endDateKey,
    exerciseCount: exerciseKeys.size,
    highlights: buildHighlights({ performedExercisesById, periodRecordIds, setRecords: allSetRecords }),
    range,
    startDateKey,
    totalDistanceMeters,
    totalDurationSeconds,
    totalReps,
    totalWeightRepsVolume,
    trainingDays: trainingDateKeys.size,
    trendPoints: buildRangeTrendPoints({
      endDateKey,
      range,
      records: periodRecords,
      sessionsById,
      startDateKey,
    }),
    topExerciseTrend: buildTopExerciseTrend({
      performedExercisesById,
      records: periodRecords,
      sessionsById,
    }),
  } satisfies SummaryRangeAnalytics
}
