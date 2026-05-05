import {
  exercises,
  type MeasurementType,
  type MuscleDistributionItem,
} from '../domain/exercise-catalog'
import { resolveCatalogExerciseId } from '../lib/exercise-name'
import {
  getMeasurementTypeForCatalogExercise,
  getMeasurementTypeForExercise,
} from '../lib/set-record-measurement'
import type {
  ExerciseProfile,
  PerformedExercise,
  PlanExercise,
  SessionPlanItem,
  SetRecord,
  WorkoutSession,
} from '../models/types'
import { db } from './app-db'
import { nowIso } from './session-core'

export type ExerciseRecordMetricKind =
  | 'highestWeight'
  | 'maxReps'
  | 'longestDuration'
  | 'longestDistance'
  | 'weightRepsVolume'
  | 'loadDistanceVolume'

export type ExerciseRecordMetric = {
  completedAt: string
  kind: ExerciseRecordMetricKind
  value: number
}

export type ExerciseRecordTrendPoint = {
  key: string
  label: string
  value: number
}

export type ExerciseRecordTrendKind =
  | 'personalBest'
  | 'bestSet'
  | 'volume'
  | 'frequency'
  | 'averageSet'
  | 'averageWeight'

export type ExerciseRecordTrendSeries = {
  kind: ExerciseRecordTrendKind
  metricKind: ExerciseRecordMetricKind
  points: ExerciseRecordTrendPoint[]
  latestValue: number | null
}

export type ExerciseRecordHistoryItem = {
  id: string
  completedAt: string
  sessionDateKey: string
  setNumber: number
  setRecord: SetRecord
}

export type ExerciseRecordSummary = {
  catalogExerciseId: string | null
  completedSets: number
  latestCompletedAt: string | null
  measurementType: MeasurementType
  name: string
  primaryMetric: ExerciseRecordMetric | null
  profileId: string
  secondaryMetrics: ExerciseRecordMetric[]
  trainingDays: number
}

export type ExerciseRecordDetail = ExerciseRecordSummary & {
  defaultMuscleDistribution: MuscleDistributionItem[]
  hasMuscleDistributionOverride: boolean
  history: ExerciseRecordHistoryItem[]
  muscleDistribution: MuscleDistributionItem[]
  totalDistanceMeters: number
  totalDurationSeconds: number
  totalReps: number
  totalVolume: number
  trendSeries: ExerciseRecordTrendSeries[]
}

type ExerciseSource = Pick<PlanExercise | SessionPlanItem | PerformedExercise, 'catalogExerciseId' | 'id' | 'name'>

type ExerciseRecordGroup = {
  catalogExerciseId: string | null
  name: string
  profileId: string
  records: Array<{
    exercise: PerformedExercise
    setRecord: SetRecord
    session: WorkoutSession
  }>
}

const catalogExercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]))

export function normalizeExerciseRecordName(name: string) {
  return name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function getExerciseProfileId(input: { catalogExerciseId?: string | null; id?: string; name?: string | null }) {
  const catalogExerciseId = resolveCatalogExerciseId(input)
  if (catalogExerciseId) {
    return `catalog:${catalogExerciseId}`
  }

  const normalizedName = normalizeExerciseRecordName(input.name ?? '')
  return normalizedName ? `name:${normalizedName}` : `exercise:${input.id ?? crypto.randomUUID()}`
}

function getMetricValues(setRecord: SetRecord, measurementType: MeasurementType) {
  const values: ExerciseRecordMetric[] = []

  if ((measurementType === 'weightReps' || measurementType === 'weightDistance') && setRecord.weightKg !== null) {
    values.push({ completedAt: setRecord.completedAt, kind: 'highestWeight', value: setRecord.weightKg })
  }
  if ((measurementType === 'weightReps' || measurementType === 'reps') && setRecord.reps !== null) {
    values.push({ completedAt: setRecord.completedAt, kind: 'maxReps', value: setRecord.reps })
  }
  if (measurementType === 'duration' && setRecord.durationSeconds !== null) {
    values.push({ completedAt: setRecord.completedAt, kind: 'longestDuration', value: setRecord.durationSeconds })
  }
  if ((measurementType === 'distance' || measurementType === 'weightDistance') && setRecord.distanceMeters !== null) {
    values.push({ completedAt: setRecord.completedAt, kind: 'longestDistance', value: setRecord.distanceMeters })
  }
  if (measurementType === 'weightReps' && setRecord.weightKg !== null && setRecord.reps !== null) {
    values.push({ completedAt: setRecord.completedAt, kind: 'weightRepsVolume', value: setRecord.weightKg * setRecord.reps })
  }
  if (measurementType === 'weightDistance' && setRecord.weightKg !== null && setRecord.distanceMeters !== null) {
    values.push({ completedAt: setRecord.completedAt, kind: 'loadDistanceVolume', value: setRecord.weightKg * setRecord.distanceMeters })
  }

  return values
}

function pickPrimaryMetricKind(measurementType: MeasurementType): ExerciseRecordMetricKind {
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

function pickVolumeMetricKind(measurementType: MeasurementType): ExerciseRecordMetricKind {
  if (measurementType === 'weightReps') {
    return 'weightRepsVolume'
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
  return 'maxReps'
}

function pickBestMetric(metrics: ExerciseRecordMetric[], kind: ExerciseRecordMetricKind) {
  return metrics
    .filter((metric) => metric.kind === kind)
    .sort((left, right) => {
      const valueDelta = right.value - left.value
      return valueDelta === 0 ? right.completedAt.localeCompare(left.completedAt) : valueDelta
    })[0] ?? null
}

function buildSummary(group: ExerciseRecordGroup): ExerciseRecordSummary {
  const measurementType = group.catalogExerciseId
    ? getMeasurementTypeForCatalogExercise(group.catalogExerciseId)
    : getMeasurementTypeForExercise(group)
  const metrics = group.records.flatMap((record) => getMetricValues(record.setRecord, measurementType))
  const primaryKind = pickPrimaryMetricKind(measurementType)
  const primaryMetric = pickBestMetric(metrics, primaryKind)
  const secondaryMetrics = Array.from(new Set(metrics.map((metric) => metric.kind)))
    .filter((kind) => kind !== primaryKind)
    .map((kind) => pickBestMetric(metrics, kind))
    .filter((metric): metric is ExerciseRecordMetric => metric !== null)
  const trainingDays = new Set(group.records.map((record) => record.session.sessionDateKey)).size
  const latestCompletedAt = group.records
    .map((record) => record.setRecord.completedAt)
    .sort((left, right) => right.localeCompare(left))[0] ?? null

  return {
    catalogExerciseId: group.catalogExerciseId,
    completedSets: group.records.length,
    latestCompletedAt,
    measurementType,
    name: group.name,
    primaryMetric,
    profileId: group.profileId,
    secondaryMetrics,
    trainingDays,
  }
}

function addSource(groups: Map<string, ExerciseRecordGroup>, source: ExerciseSource) {
  const catalogExerciseId = resolveCatalogExerciseId(source)
  const normalizedName = normalizeExerciseRecordName(source.name)
  const profileId = getExerciseProfileId(source)
  if (!catalogExerciseId && !normalizedName) {
    return
  }

  const current = groups.get(profileId)
  if (current) {
    if (!current.name && source.name.trim()) {
      current.name = source.name.trim()
    }
    return
  }

  groups.set(profileId, {
    catalogExerciseId,
    name: source.name.trim() || catalogExerciseId || source.id,
    profileId,
    records: [],
  })
}

async function buildExerciseRecordGroups() {
  const [
    planExercises,
    sessionPlanItems,
    performedExercises,
    setRecords,
    sessions,
  ] = await Promise.all([
    db.planExercises.toArray(),
    db.sessionPlanItems.toArray(),
    db.performedExercises.toArray(),
    db.setRecords.orderBy('completedAt').toArray(),
    db.workoutSessions.toArray(),
  ])
  const groups = new Map<string, ExerciseRecordGroup>()
  const performedExercisesById = new Map(performedExercises.map((exercise) => [exercise.id, exercise]))
  const sessionsById = new Map(sessions.map((session) => [session.id, session]))

  for (const exercise of exercises) {
    addSource(groups, {
      catalogExerciseId: exercise.id,
      id: exercise.id,
      name: exercise.id,
    })
  }
  for (const exercise of planExercises) {
    addSource(groups, exercise)
  }
  for (const exercise of sessionPlanItems) {
    addSource(groups, exercise)
  }
  for (const exercise of performedExercises) {
    addSource(groups, exercise)
  }

  for (const setRecord of setRecords) {
    const exercise = performedExercisesById.get(setRecord.performedExerciseId)
    const session = sessionsById.get(setRecord.sessionId)
    if (!exercise || !session) {
      continue
    }

    const profileId = getExerciseProfileId(exercise)
    const group = groups.get(profileId)
    if (!group) {
      continue
    }

    group.records.push({ exercise, setRecord, session })
  }

  return groups
}

export async function listExerciseRecordSummaries() {
  const groups = await buildExerciseRecordGroups()
  return Array.from(groups.values()).map(buildSummary)
}

function getDefaultMuscleDistribution(catalogExerciseId: string | null) {
  if (!catalogExerciseId) {
    return []
  }

  return catalogExercisesById.get(catalogExerciseId)?.muscleDistribution ?? []
}

export async function getExerciseProfile(profileId: string) {
  return db.exerciseProfiles.get(profileId)
}

export async function getEffectiveExerciseMuscleDistribution(input: {
  catalogExerciseId?: string | null
  name?: string | null
}) {
  const catalogExerciseId = resolveCatalogExerciseId(input)
  const profileId = getExerciseProfileId(input)
  const profile = await getExerciseProfile(profileId)

  return profile?.muscleDistribution ?? getDefaultMuscleDistribution(catalogExerciseId)
}

export async function saveExerciseProfileMuscleDistribution(input: {
  catalogExerciseId: string | null
  muscleDistribution: MuscleDistributionItem[]
  name: string
  profileId: string
}) {
  const profile: ExerciseProfile = {
    catalogExerciseId: input.catalogExerciseId,
    id: input.profileId,
    muscleDistribution: input.muscleDistribution,
    name: input.name,
    updatedAt: nowIso(),
  }

  await db.exerciseProfiles.put(profile)
}

export async function resetExerciseProfileMuscleDistribution(profileId: string) {
  await db.exerciseProfiles.delete(profileId)
}

function getTrendMetricValue(setRecord: SetRecord, measurementType: MeasurementType, kind: ExerciseRecordMetricKind) {
  return getMetricValues(setRecord, measurementType).find((metric) => metric.kind === kind)?.value
}

function getSetVolumeValue(setRecord: SetRecord, measurementType: MeasurementType) {
  if (measurementType === 'weightReps' && setRecord.weightKg !== null && setRecord.reps !== null) {
    return setRecord.weightKg * setRecord.reps
  }
  if (measurementType === 'reps' && setRecord.reps !== null) {
    return setRecord.reps
  }
  if (measurementType === 'duration' && setRecord.durationSeconds !== null) {
    return setRecord.durationSeconds
  }
  if (measurementType === 'distance' && setRecord.distanceMeters !== null) {
    return setRecord.distanceMeters
  }
  if (measurementType === 'weightDistance' && setRecord.weightKg !== null && setRecord.distanceMeters !== null) {
    return setRecord.weightKg * setRecord.distanceMeters
  }

  return null
}

function makeTrendPoints(valuesByDate: Map<string, number>) {
  return Array.from(valuesByDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({ key, label: key.slice(5), value }))
}

function buildTrendSeries(group: ExerciseRecordGroup, measurementType: MeasurementType) {
  const primaryKind = pickPrimaryMetricKind(measurementType)
  const volumeKind = pickVolumeMetricKind(measurementType)
  const dailyBestByDate = new Map<string, number>()
  const volumeByDate = new Map<string, number>()
  const frequencyByDate = new Map<string, number>()

  for (const record of group.records) {
    const dateKey = record.session.sessionDateKey
    const value = getTrendMetricValue(record.setRecord, measurementType, primaryKind)
    if (value !== undefined) {
      const current = dailyBestByDate.get(dateKey)
      if (current === undefined || value > current) {
        dailyBestByDate.set(dateKey, value)
      }
    }

    const volume = getSetVolumeValue(record.setRecord, measurementType)
    if (volume !== null) {
      volumeByDate.set(dateKey, (volumeByDate.get(dateKey) ?? 0) + volume)
    }

    if (value !== undefined || volume !== null) {
      frequencyByDate.set(dateKey, 1)
    }
  }

  const dailyBestPoints = makeTrendPoints(dailyBestByDate)
  let personalBest = 0
  const personalBestPoints = dailyBestPoints.map((point) => {
    personalBest = Math.max(personalBest, point.value)
    return { ...point, value: personalBest }
  })
  const volumePoints = makeTrendPoints(volumeByDate)
  const frequencyPoints = makeTrendPoints(frequencyByDate)

  return [
    {
      kind: 'personalBest',
      metricKind: primaryKind,
      points: personalBestPoints,
      latestValue: personalBestPoints.at(-1)?.value ?? null,
    },
    {
      kind: 'bestSet',
      metricKind: primaryKind,
      points: dailyBestPoints,
      latestValue: dailyBestPoints.at(-1)?.value ?? null,
    },
    {
      kind: 'volume',
      metricKind: volumeKind,
      points: volumePoints,
      latestValue: volumePoints.at(-1)?.value ?? null,
    },
    {
      kind: 'frequency',
      metricKind: 'maxReps',
      points: frequencyPoints,
      latestValue: frequencyPoints.at(-1)?.value ?? null,
    },
  ] satisfies ExerciseRecordTrendSeries[]
}

export async function getExerciseRecordDetail(profileId: string) {
  const groups = await buildExerciseRecordGroups()
  const group = groups.get(profileId)
  if (!group) {
    return null
  }

  const summary = buildSummary(group)
  const profile = await getExerciseProfile(profileId)
  const defaultMuscleDistribution = getDefaultMuscleDistribution(summary.catalogExerciseId)
  let totalDistanceMeters = 0
  let totalDurationSeconds = 0
  let totalReps = 0
  let totalVolume = 0

  for (const record of group.records) {
    if ((summary.measurementType === 'weightReps' || summary.measurementType === 'reps') && record.setRecord.reps !== null) {
      totalReps += record.setRecord.reps
    }
    if (summary.measurementType === 'duration' && record.setRecord.durationSeconds !== null) {
      totalDurationSeconds += record.setRecord.durationSeconds
    }
    if ((summary.measurementType === 'distance' || summary.measurementType === 'weightDistance') && record.setRecord.distanceMeters !== null) {
      totalDistanceMeters += record.setRecord.distanceMeters
    }
    if (summary.measurementType === 'weightReps' && record.setRecord.weightKg !== null && record.setRecord.reps !== null) {
      totalVolume += record.setRecord.weightKg * record.setRecord.reps
    }
    if (summary.measurementType === 'weightDistance' && record.setRecord.weightKg !== null && record.setRecord.distanceMeters !== null) {
      totalVolume += record.setRecord.weightKg * record.setRecord.distanceMeters
    }
  }

  return {
    ...summary,
    defaultMuscleDistribution,
    hasMuscleDistributionOverride: profile !== undefined,
    history: group.records
      .map((record) => ({
        id: record.setRecord.id,
        completedAt: record.setRecord.completedAt,
        sessionDateKey: record.session.sessionDateKey,
        setNumber: record.setRecord.setNumber,
        setRecord: record.setRecord,
      }))
      .sort((left, right) => right.completedAt.localeCompare(left.completedAt)),
    muscleDistribution: profile?.muscleDistribution ?? defaultMuscleDistribution,
    totalDistanceMeters,
    totalDurationSeconds,
    totalReps,
    totalVolume,
    trendSeries: buildTrendSeries(group, summary.measurementType),
  } satisfies ExerciseRecordDetail
}
