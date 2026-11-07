import type { TFunction } from 'i18next'

import { exercises, type MeasurementType } from '../domain/exercise-catalog'
import { resolveCatalogExerciseId } from './exercise-name'
import type { SetRecord } from '../models/types'
import {
  formatLoadDistanceVolume,
  formatWeightKg,
  formatWeightRepsVolume,
  getStoredWeightUnitPreference,
  kgToDisplayWeightString,
} from './weight-units'

export type SetRecordValueInput = {
  weightKg?: number | null
  reps?: number | null
  durationSeconds?: number | null
  distanceMeters?: number | null
  rightWeightKg?: number | null
  rightReps?: number | null
}

export const recordingModeCycle: MeasurementType[] = [
  'weightReps', 'leftRightWeightReps', 'reps', 'durationReps', 'duration',
]

export function getNextRecordingMode(current: MeasurementType): MeasurementType {
  return recordingModeCycle[(recordingModeCycle.indexOf(current) + 1) % recordingModeCycle.length]
}

export function getSetRecordMeasurementType(record: SetRecord, fallback: MeasurementType): MeasurementType {
  return record.measurementType ?? fallback
}

export function areRecordingModesComparable(first: MeasurementType, second: MeasurementType) {
  const group = (type: MeasurementType) => type === 'leftRightWeightReps' ? 'weightReps' : type
  return group(first) === group(second)
}

export function formatWeightValues(left: number | null | undefined, right: number | null | undefined, t: TFunction) {
  if (left != null && right != null) {
    return t(`common.weight.${getStoredWeightUnitPreference()}`, {
      value: `${kgToDisplayWeightString(left)}/${kgToDisplayWeightString(right)}`,
    })
  }
  const value = left ?? right
  return value == null ? t('summary.completedValue') : formatWeightKg(value, t)
}

export function formatRepsValues(left: number | null | undefined, right: number | null | undefined, t: TFunction) {
  const value = left != null && right != null ? `${formatNumber(left)}/${formatNumber(right)}` : left ?? right
  return value == null ? t('summary.completedValue') : t('common.reps', { value })
}

export function getSetRecordEntries(record: SetRecord, fallback: MeasurementType): SetRecord[] {
  const type = getSetRecordMeasurementType(record, fallback)
  const measured = { ...record, ...buildSetRecordValuesForMeasurement(type, record), measurementType: type }
  if (type !== 'leftRightWeightReps') return [measured]
  return [
    { ...measured, measurementType: 'weightReps' },
    { ...measured, measurementType: 'weightReps', weightKg: record.rightWeightKg ?? null, reps: record.rightReps ?? null },
  ]
}

export function getSetRecordStatistics(record: SetRecord, fallback: MeasurementType) {
  const entries = getSetRecordEntries(record, fallback)
  const bilateral = getSetRecordMeasurementType(record, fallback) === 'leftRightWeightReps'
  const max = (values: (number | null)[]) => {
    const present = values.filter((value): value is number => value !== null)
    return present.length ? Math.max(...present) : null
  }
  const volume = (type: MeasurementType, field: 'reps' | 'distanceMeters') => {
    const values = entries.flatMap((entry) => entry.measurementType === type && entry.weightKg !== null && entry[field] !== null
      ? [entry.weightKg * entry[field]!] : [])
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null
  }
  const weights = entries.flatMap((entry) => entry.weightKg === null ? [] : [entry.weightKg])
  const reps = entries.flatMap((entry) => entry.reps === null ? [] : [entry.reps])
  return {
    highestWeight: bilateral && weights.length ? weights.reduce((sum, value) => sum + value, 0) : max(weights),
    maxReps: bilateral && reps.length ? reps.reduce((sum, value) => sum + value, 0) / reps.length : max(reps),
    longestDuration: max(entries.map((entry) => entry.durationSeconds)),
    longestDistance: max(entries.map((entry) => entry.distanceMeters)),
    weightRepsVolume: volume('weightReps', 'reps'),
    loadDistanceVolume: volume('weightDistance', 'distanceMeters'),
    totalReps: entries.reduce((sum, entry) => sum + (entry.reps ?? 0), 0),
    totalDurationSeconds: entries.reduce((sum, entry) => sum + (entry.durationSeconds ?? 0), 0),
    totalDistanceMeters: entries.reduce((sum, entry) => sum + (entry.distanceMeters ?? 0), 0),
  }
}

const catalogMeasurementTypes = new Map(exercises.map((exercise) => [exercise.id, exercise.measurementType]))

export function getMeasurementTypeForCatalogExercise(catalogExerciseId?: string | null): MeasurementType {
  return catalogExerciseId ? catalogMeasurementTypes.get(catalogExerciseId) ?? 'weightReps' : 'weightReps'
}

export function getMeasurementTypeForExercise(input: {
  catalogExerciseId?: string | null
  measurementType?: MeasurementType | null
  name?: string | null
}): MeasurementType {
  if (input.measurementType) {
    return input.measurementType
  }

  const catalogExerciseId = resolveCatalogExerciseId(input)
  return getMeasurementTypeForCatalogExercise(catalogExerciseId)
}

export function buildSetRecordValuesForMeasurement(
  measurementType: MeasurementType,
  input: SetRecordValueInput,
) {
  const values = {
    weightKg: null,
    reps: null,
    durationSeconds: null,
    distanceMeters: null,
  } satisfies SetRecordValueInput

  if (measurementType === 'weightReps') {
    return { ...values, weightKg: input.weightKg ?? null, reps: input.reps ?? null }
  }

  if (measurementType === 'leftRightWeightReps') {
    return {
      ...values,
      weightKg: input.weightKg ?? null,
      reps: input.reps ?? null,
      rightWeightKg: input.rightWeightKg ?? null,
      rightReps: input.rightReps ?? null,
    }
  }

  if (measurementType === 'durationReps') {
    return { ...values, durationSeconds: input.durationSeconds ?? null, reps: input.reps ?? null }
  }

  if (measurementType === 'reps') {
    return { ...values, reps: input.reps ?? null }
  }

  if (measurementType === 'duration') {
    return { ...values, durationSeconds: input.durationSeconds ?? null }
  }

  if (measurementType === 'distance') {
    return { ...values, distanceMeters: input.distanceMeters ?? null }
  }

  return { ...values, weightKg: input.weightKg ?? null, distanceMeters: input.distanceMeters ?? null }
}

export function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2))).replace(/\.0$/, '')
}

export function formatDurationSeconds(seconds: number, t: TFunction) {
  if (seconds >= 60 && seconds % 60 === 0) {
    return t('common.minutes', { value: seconds / 60 })
  }

  return t('common.seconds', { value: seconds })
}

export function formatDistanceMeters(meters: number, t: TFunction) {
  if (meters >= 1000) {
    return t('common.kilometers', { value: formatNumber(meters / 1000) })
  }

  return t('common.meters', { value: formatNumber(meters) })
}

export function formatSetRecordValue(
  setRecord: SetRecord,
  measurementType: MeasurementType,
  t: TFunction,
): string {
  measurementType = getSetRecordMeasurementType(setRecord, measurementType)
  if (measurementType === 'leftRightWeightReps') {
    const hasWeight = setRecord.weightKg != null || setRecord.rightWeightKg != null
    const hasReps = setRecord.reps != null || setRecord.rightReps != null
    const weight = formatWeightValues(setRecord.weightKg, setRecord.rightWeightKg, t)
    const reps = formatRepsValues(setRecord.reps, setRecord.rightReps, t)
    return hasWeight && hasReps ? t('summary.weightRepsValue', {
      weight, reps: setRecord.reps != null && setRecord.rightReps != null
        ? `${formatNumber(setRecord.reps)}/${formatNumber(setRecord.rightReps)}` : setRecord.reps ?? setRecord.rightReps,
    }) : hasWeight ? weight : reps
  }
  if (measurementType === 'durationReps') {
    const parts = [
      setRecord.durationSeconds === null ? null : formatDurationSeconds(setRecord.durationSeconds, t),
      setRecord.reps === null ? null : t('common.reps', { value: setRecord.reps }),
    ].filter(Boolean)
    return parts.length ? parts.join(' · ') : t('summary.completedValue')
  }
  if (measurementType === 'weightReps') {
    if (setRecord.weightKg !== null && setRecord.reps !== null) {
      return t('summary.weightRepsValue', {
        reps: setRecord.reps,
        weight: formatWeightKg(setRecord.weightKg, t),
      })
    }

    if (setRecord.weightKg !== null) {
      return formatWeightKg(setRecord.weightKg, t)
    }

    return setRecord.reps === null ? t('summary.completedValue') : t('common.reps', { value: setRecord.reps })
  }

  if (measurementType === 'reps') {
    return setRecord.reps === null ? t('summary.completedValue') : t('common.reps', { value: setRecord.reps })
  }

  if (measurementType === 'duration') {
    return setRecord.durationSeconds === null
      ? t('summary.completedValue')
      : formatDurationSeconds(setRecord.durationSeconds, t)
  }

  if (measurementType === 'distance') {
    return setRecord.distanceMeters === null
      ? t('summary.completedValue')
      : formatDistanceMeters(setRecord.distanceMeters, t)
  }

  if (setRecord.weightKg !== null && setRecord.distanceMeters !== null) {
    return t('summary.weightDistanceValue', {
      distance: formatDistanceMeters(setRecord.distanceMeters, t),
      weight: formatWeightKg(setRecord.weightKg, t),
    })
  }

  if (setRecord.weightKg !== null) {
    return formatWeightKg(setRecord.weightKg, t)
  }

  return setRecord.distanceMeters === null
    ? t('summary.completedValue')
    : formatDistanceMeters(setRecord.distanceMeters, t)
}

export function getRecordSummaryParts(
  setRecords: SetRecord[],
  measurementType: MeasurementType,
  t: TFunction,
) {
  const bestWeightRecord = [...setRecords].sort((left, right) =>
    (getSetRecordStatistics(right, measurementType).highestWeight ?? -1) -
    (getSetRecordStatistics(left, measurementType).highestWeight ?? -1))[0]
  const highestWeight = bestWeightRecord ? getSetRecordStatistics(bestWeightRecord, measurementType).highestWeight : null
  setRecords = setRecords.flatMap((record) => getSetRecordEntries(record, measurementType))
  const reps = setRecords
    .map((setRecord) => setRecord.reps)
    .filter((repCount): repCount is number => repCount !== null)
  const durations = setRecords
    .map((setRecord) => setRecord.durationSeconds)
    .filter((durationSeconds): durationSeconds is number => durationSeconds !== null)
  const distances = setRecords
    .map((setRecord) => setRecord.distanceMeters)
    .filter((distanceMeters): distanceMeters is number => distanceMeters !== null)
  const parts: string[] = []

  if (highestWeight !== null && bestWeightRecord) {
    parts.push(t('summary.highestWeight', { weight: formatWeightValues(
      bestWeightRecord.weightKg,
      getSetRecordMeasurementType(bestWeightRecord, measurementType) === 'leftRightWeightReps' ? bestWeightRecord.rightWeightKg : null,
      t,
    ) }))
  }

  if (reps.length > 0) {
    parts.push(t('summary.totalReps', { reps: reps.reduce((acc, repCount) => acc + repCount, 0) }))
  }

  if (setRecords.some((record) => record.measurementType === 'weightReps')) {
    const volume = setRecords.reduce(
      (acc, setRecord) =>
        setRecord.measurementType === 'weightReps' && setRecord.weightKg !== null && setRecord.reps !== null
          ? acc + setRecord.weightKg * setRecord.reps
          : acc,
      0,
    )
    if (volume > 0) {
      parts.push(t('summary.totalVolume', { volume: formatWeightRepsVolume(volume, t) }))
    }
  }

  if (durations.length > 0) {
    const totalDuration = durations.reduce((acc, durationSeconds) => acc + durationSeconds, 0)
    parts.push(t('summary.totalDuration', { duration: formatDurationSeconds(totalDuration, t) }))
    parts.push(t('summary.longestDuration', { duration: formatDurationSeconds(Math.max(...durations), t) }))
  }

  if (distances.length > 0) {
    const totalDistance = distances.reduce((acc, distanceMeters) => acc + distanceMeters, 0)
    parts.push(t('summary.totalDistance', { distance: formatDistanceMeters(totalDistance, t) }))
    if (setRecords.some((record) => record.measurementType === 'distance')) {
      parts.push(t('summary.longestDistance', { distance: formatDistanceMeters(Math.max(...distances), t) }))
    }
  }

  if (setRecords.some((record) => record.measurementType === 'weightDistance')) {
    const volume = setRecords.reduce(
      (acc, setRecord) =>
        setRecord.measurementType === 'weightDistance' && setRecord.weightKg !== null && setRecord.distanceMeters !== null
          ? acc + setRecord.weightKg * setRecord.distanceMeters
          : acc,
      0,
    )
    if (volume > 0) {
      parts.push(t('summary.loadDistanceVolume', { volume: formatLoadDistanceVolume(volume, t) }))
    }
  }

  return parts
}
