import {
  exercises,
  type MeasurementType,
  type MuscleDistributionItem,
  type MovementPattern,
  type MuscleGroup,
} from '../domain/exercise-catalog'
import { findCatalogExerciseIdByExactName, resolveCatalogExerciseId } from '../lib/exercise-name'
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
  displayNameOverride?: string | null
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

export type CreateCustomExerciseProfileResult = 'created' | 'exists' | 'empty'

export type SaveExerciseModelResult =
  | { status: 'saved'; profileId: string }
  | { status: 'empty' | 'exists' | 'notFound' }

export type ExerciseModelForm = {
  catalogExerciseId: string | null
  muscleDistribution: MuscleDistributionItem[]
  movementPattern: MovementPattern
  measurementType: MeasurementType
  name: string
  profileId: string | null
  source?: 'custom'
}

export type ExerciseModelOption = {
  catalogExerciseId: string | null
  muscleDistribution: MuscleDistributionItem[]
  movementPattern: MovementPattern
  measurementType: MeasurementType
  name: string
  profileId: string
  categoryId: MuscleGroup | 'other'
}

type ExerciseSource = Pick<
  PlanExercise | SessionPlanItem | PerformedExercise,
  'catalogExerciseId' | 'id' | 'measurementType' | 'name'
>

type ExerciseRecordGroup = {
  catalogExerciseId: string | null
  displayNameOverride?: string | null
  deletedAt?: string | null
  name: string
  measurementType: MeasurementType
  profileId: string
  records: Array<{
    exercise: PerformedExercise
    setRecord: SetRecord
    session: WorkoutSession
  }>
}

const catalogExercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]))
const catalogProfileIds = new Set(exercises.map((exercise) => `catalog:${exercise.id}`))
const fallbackMovementPattern: MovementPattern = 'fullBody'
const fallbackMeasurementType: MeasurementType = 'weightReps'

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

function getDefaultMeasurementType(catalogExerciseId: string | null): MeasurementType {
  if (!catalogExerciseId) {
    return fallbackMeasurementType
  }

  return catalogExercisesById.get(catalogExerciseId)?.measurementType ?? fallbackMeasurementType
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
  const measurementType = group.measurementType
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
    displayNameOverride: group.displayNameOverride ?? null,
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
  const measurementType = source.measurementType ?? getDefaultMeasurementType(catalogExerciseId)
  if (!catalogExerciseId && !normalizedName) {
    return
  }

  const current = groups.get(profileId)
  if (current) {
    if (!current.name && source.name.trim()) {
      current.name = source.name.trim()
    }
    current.measurementType = current.measurementType ?? measurementType
    return
  }

  groups.set(profileId, {
    catalogExerciseId,
    name: source.name.trim() || catalogExerciseId || source.id,
    measurementType,
    profileId,
    records: [],
  })
}

function addCustomProfile(groups: Map<string, ExerciseRecordGroup>, profile: ExerciseProfile) {
  if (profile.source !== 'custom' || profile.deletedAt) {
    return
  }

  addSource(groups, {
    catalogExerciseId: profile.catalogExerciseId ?? null,
    id: profile.id,
    name: profile.name,
    measurementType: profile.measurementType ?? getDefaultMeasurementType(profile.catalogExerciseId ?? null),
  })
}

function applyProfileOverrides(groups: Map<string, ExerciseRecordGroup>, profiles: ExerciseProfile[]) {
  for (const profile of profiles) {
    const group = groups.get(profile.id)
    if (!group) {
      continue
    }

    group.deletedAt = profile.deletedAt ?? null
    group.measurementType = profile.measurementType ?? group.measurementType
    if (profile.name.trim()) {
      group.name = profile.name.trim()
      group.displayNameOverride = profile.name.trim()
    }
  }
}

async function buildExerciseRecordGroups() {
  const [
    exerciseProfiles,
    planExercises,
    sessionPlanItems,
    performedExercises,
    setRecords,
    sessions,
  ] = await Promise.all([
    db.exerciseProfiles.toArray(),
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
      measurementType: exercise.measurementType,
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
  for (const profile of exerciseProfiles) {
    addCustomProfile(groups, profile)
  }
  applyProfileOverrides(groups, exerciseProfiles)

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
  return Array.from(groups.values())
    .map(buildSummary)
    .filter((summary) => summary.completedSets > 0 || !groups.get(summary.profileId)?.deletedAt)
}

function getDefaultMuscleDistribution(catalogExerciseId: string | null) {
  if (!catalogExerciseId) {
    return []
  }

  return catalogExercisesById.get(catalogExerciseId)?.muscleDistribution ?? []
}

function getDefaultMovementPattern(catalogExerciseId: string | null): MovementPattern {
  if (!catalogExerciseId) {
    return fallbackMovementPattern
  }

  return catalogExercisesById.get(catalogExerciseId)?.movementPattern ?? fallbackMovementPattern
}

function getTopMuscleCategory(distribution: MuscleDistributionItem[]): MuscleGroup | 'other' {
  const topItem = distribution
    .filter((item) => item.ratio > 0)
    .sort((left, right) => right.ratio - left.ratio)[0]

  return topItem?.muscleGroupId ?? 'other'
}

function getCatalogExerciseIdFromProfileId(profileId: string) {
  return profileId.startsWith('catalog:') ? profileId.slice('catalog:'.length) : null
}

export async function getExerciseProfile(profileId: string) {
  return db.exerciseProfiles.get(profileId)
}

export async function listExerciseModelOptions(): Promise<ExerciseModelOption[]> {
  const profiles = await db.exerciseProfiles.toArray()
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  const options: ExerciseModelOption[] = []

  for (const exercise of exercises) {
    const profileId = `catalog:${exercise.id}`
    const profile = profilesById.get(profileId)
    if (profile?.deletedAt) {
      continue
    }

    const muscleDistribution = profile?.muscleDistribution ?? exercise.muscleDistribution
    options.push({
      catalogExerciseId: exercise.id,
      categoryId: getTopMuscleCategory(muscleDistribution),
      muscleDistribution,
      movementPattern: profile?.movementPattern ?? exercise.movementPattern,
      measurementType: profile?.measurementType ?? exercise.measurementType,
      name: profile?.name.trim() ?? '',
      profileId,
    })
  }

  for (const profile of profiles) {
    if (profile.source !== 'custom' || profile.deletedAt) {
      continue
    }

    const muscleDistribution = profile.muscleDistribution ?? []
    options.push({
      catalogExerciseId: null,
      categoryId: getTopMuscleCategory(muscleDistribution),
      muscleDistribution,
      movementPattern: profile.movementPattern ?? fallbackMovementPattern,
      measurementType: profile.measurementType ?? fallbackMeasurementType,
      name: profile.name,
      profileId: profile.id,
    })
  }

  return options
}

export async function getExerciseModelForm(profileId: string | null): Promise<ExerciseModelForm | null> {
  if (!profileId) {
    return {
      catalogExerciseId: null,
      muscleDistribution: [],
      movementPattern: fallbackMovementPattern,
      measurementType: fallbackMeasurementType,
      name: '',
      profileId: null,
      source: 'custom',
    }
  }

  const profile = await getExerciseProfile(profileId)
  const catalogExerciseId = getCatalogExerciseIdFromProfileId(profileId)
  if (catalogExerciseId) {
    if (!catalogExercisesById.has(catalogExerciseId)) {
      return null
    }

    return {
      catalogExerciseId,
      muscleDistribution: profile?.muscleDistribution ?? getDefaultMuscleDistribution(catalogExerciseId),
      movementPattern: profile?.movementPattern ?? getDefaultMovementPattern(catalogExerciseId),
      measurementType: profile?.measurementType ?? getDefaultMeasurementType(catalogExerciseId),
      name: profile?.name ?? '',
      profileId,
      source: profile?.source,
    }
  }

  if (!profile) {
    return null
  }

  return {
    catalogExerciseId: profile.catalogExerciseId ?? null,
    muscleDistribution: profile.muscleDistribution ?? [],
    movementPattern: profile.movementPattern ?? getDefaultMovementPattern(profile.catalogExerciseId ?? null),
    measurementType: profile.measurementType ?? getDefaultMeasurementType(profile.catalogExerciseId ?? null),
    name: profile.name,
    profileId: profile.id,
    source: profile.source,
  }
}

async function hasExerciseModelNameConflict(name: string, currentProfileId: string | null) {
  const normalizedName = normalizeExerciseRecordName(name)
  const matchedCatalogExerciseId = findCatalogExerciseIdByExactName(name)
  if (matchedCatalogExerciseId && currentProfileId !== `catalog:${matchedCatalogExerciseId}`) {
    return true
  }

  const profiles = await db.exerciseProfiles.toArray()
  if (profiles.some((profile) =>
    !profile.deletedAt
    && profile.id !== currentProfileId
    && normalizeExerciseRecordName(profile.name) === normalizedName
  )) {
    return true
  }

  const groups = await buildExerciseRecordGroups()
  return Array.from(groups.values()).some((group) =>
    group.profileId !== currentProfileId
    && !group.deletedAt
    && normalizeExerciseRecordName(group.name) === normalizedName
  )
}

export async function saveExerciseModel(input: {
  catalogExerciseId: string | null
  muscleDistribution: MuscleDistributionItem[]
  movementPattern: MovementPattern
  measurementType: MeasurementType
  name: string
  profileId: string | null
}): Promise<SaveExerciseModelResult> {
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    return { status: 'empty' }
  }

  const currentProfileId = input.profileId
  const isCatalogProfile = currentProfileId ? catalogProfileIds.has(currentProfileId) : false
  const profileId: string = isCatalogProfile && currentProfileId
    ? currentProfileId
    : getExerciseProfileId({ name: trimmedName })

  if (await hasExerciseModelNameConflict(trimmedName, currentProfileId)) {
    return { status: 'exists' }
  }

  const current = currentProfileId ? await getExerciseProfile(currentProfileId) : null
  if (currentProfileId && !isCatalogProfile && !current) {
    return { status: 'notFound' }
  }

  const timestamp = nowIso()
  const profile: ExerciseProfile = {
    catalogExerciseId: isCatalogProfile ? input.catalogExerciseId : null,
    id: profileId,
    muscleDistribution: input.muscleDistribution,
    movementPattern: input.movementPattern,
    measurementType: input.measurementType,
    name: trimmedName,
    source: isCatalogProfile ? undefined : 'custom',
    updatedAt: timestamp,
  }

  await db.exerciseProfiles.put(profile)
  if (currentProfileId && currentProfileId !== profileId && current) {
    await db.exerciseProfiles.update(currentProfileId, {
      deletedAt: timestamp,
      updatedAt: timestamp,
    })
  }

  return { status: 'saved', profileId }
}

export async function softDeleteExerciseModel(profileId: string) {
  const timestamp = nowIso()
  const current = await getExerciseProfile(profileId)
  if (current) {
    await db.exerciseProfiles.update(profileId, {
      deletedAt: timestamp,
      updatedAt: timestamp,
    })
    return
  }

  const catalogExerciseId = getCatalogExerciseIdFromProfileId(profileId)
  if (!catalogExerciseId || !catalogExercisesById.has(catalogExerciseId)) {
    return
  }

  const profile: ExerciseProfile = {
    catalogExerciseId,
    deletedAt: timestamp,
    id: profileId,
    muscleDistribution: getDefaultMuscleDistribution(catalogExerciseId),
    movementPattern: getDefaultMovementPattern(catalogExerciseId),
    measurementType: getDefaultMeasurementType(catalogExerciseId),
    name: catalogExerciseId,
    updatedAt: timestamp,
  }
  await db.exerciseProfiles.put(profile)
}

export async function createCustomExerciseProfile(name: string): Promise<CreateCustomExerciseProfileResult> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return 'empty'
  }

  const profileId = getExerciseProfileId({ name: trimmedName })
  const groups = await buildExerciseRecordGroups()
  if (groups.has(profileId)) {
    return 'exists'
  }

  const timestamp = nowIso()
  const profile: ExerciseProfile = {
    catalogExerciseId: null,
    id: profileId,
    muscleDistribution: [],
    movementPattern: fallbackMovementPattern,
    measurementType: fallbackMeasurementType,
    name: trimmedName,
    source: 'custom',
    updatedAt: timestamp,
  }

  await db.exerciseProfiles.put(profile)
  return 'created'
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
  const current = await getExerciseProfile(input.profileId)
  const profile: ExerciseProfile = {
    catalogExerciseId: input.catalogExerciseId,
    deletedAt: current?.deletedAt,
    id: input.profileId,
    muscleDistribution: input.muscleDistribution,
    movementPattern: current?.movementPattern ?? getDefaultMovementPattern(input.catalogExerciseId),
    measurementType: current?.measurementType ?? getDefaultMeasurementType(input.catalogExerciseId),
    name: input.name,
    source: current?.source,
    updatedAt: nowIso(),
  }

  await db.exerciseProfiles.put(profile)
}

export async function resetExerciseProfileMuscleDistribution(profileId: string) {
  const profile = await getExerciseProfile(profileId)
  if (profile?.source === 'custom') {
    await db.exerciseProfiles.update(profileId, {
      muscleDistribution: [],
      updatedAt: nowIso(),
    })
    return
  }

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
    hasMuscleDistributionOverride: (profile?.muscleDistribution.length ?? 0) > 0,
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
