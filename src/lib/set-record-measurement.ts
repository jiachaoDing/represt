import type { TFunction } from 'i18next'

import { exercises, type MeasurementType } from '../domain/exercise-catalog'
import { resolveCatalogExerciseId } from './exercise-name'
import type { SetRecord } from '../models/types'

type SetRecordValueInput = {
  weightKg?: number | null
  reps?: number | null
  durationSeconds?: number | null
  distanceMeters?: number | null
}

const catalogMeasurementTypes = new Map(exercises.map((exercise) => [exercise.id, exercise.measurementType]))

export function getMeasurementTypeForCatalogExercise(catalogExerciseId?: string | null): MeasurementType {
  return catalogExerciseId ? catalogMeasurementTypes.get(catalogExerciseId) ?? 'weightReps' : 'weightReps'
}

export function getMeasurementTypeForExercise(input: {
  catalogExerciseId?: string | null
  name?: string | null
}): MeasurementType {
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
) {
  if (measurementType === 'weightReps') {
    if (setRecord.weightKg !== null && setRecord.reps !== null) {
      return t('summary.weightRepsValue', {
        reps: setRecord.reps,
        weight: formatNumber(setRecord.weightKg),
      })
    }

    if (setRecord.weightKg !== null) {
      return t('common.kg', { value: formatNumber(setRecord.weightKg) })
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
      weight: formatNumber(setRecord.weightKg),
    })
  }

  if (setRecord.weightKg !== null) {
    return t('common.kg', { value: formatNumber(setRecord.weightKg) })
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
  const weights = setRecords
    .map((setRecord) => setRecord.weightKg)
    .filter((weightKg): weightKg is number => weightKg !== null)
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

  if ((measurementType === 'weightReps' || measurementType === 'weightDistance') && weights.length > 0) {
    parts.push(t('summary.highestWeight', { weight: formatNumber(Math.max(...weights)) }))
  }

  if ((measurementType === 'weightReps' || measurementType === 'reps') && reps.length > 0) {
    parts.push(t('summary.totalReps', { reps: reps.reduce((acc, repCount) => acc + repCount, 0) }))
  }

  if (measurementType === 'weightReps') {
    const volume = setRecords.reduce(
      (acc, setRecord) =>
        setRecord.weightKg !== null && setRecord.reps !== null
          ? acc + setRecord.weightKg * setRecord.reps
          : acc,
      0,
    )
    if (volume > 0) {
      parts.push(t('summary.totalVolume', { volume: formatNumber(volume) }))
    }
  }

  if (measurementType === 'duration' && durations.length > 0) {
    const totalDuration = durations.reduce((acc, durationSeconds) => acc + durationSeconds, 0)
    parts.push(t('summary.totalDuration', { duration: formatDurationSeconds(totalDuration, t) }))
    parts.push(t('summary.longestDuration', { duration: formatDurationSeconds(Math.max(...durations), t) }))
  }

  if ((measurementType === 'distance' || measurementType === 'weightDistance') && distances.length > 0) {
    const totalDistance = distances.reduce((acc, distanceMeters) => acc + distanceMeters, 0)
    parts.push(t('summary.totalDistance', { distance: formatDistanceMeters(totalDistance, t) }))
    if (measurementType === 'distance') {
      parts.push(t('summary.longestDistance', { distance: formatDistanceMeters(Math.max(...distances), t) }))
    }
  }

  if (measurementType === 'weightDistance') {
    const volume = setRecords.reduce(
      (acc, setRecord) =>
        setRecord.weightKg !== null && setRecord.distanceMeters !== null
          ? acc + setRecord.weightKg * setRecord.distanceMeters
          : acc,
      0,
    )
    if (volume > 0) {
      parts.push(t('summary.loadDistanceVolume', { volume: formatNumber(volume) }))
    }
  }

  return parts
}
