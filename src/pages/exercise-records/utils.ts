import type { TFunction } from 'i18next'

import { muscleGroups, type MuscleDistributionItem, type MuscleGroup } from '../../domain/exercise-catalog'
import {
  formatDistanceMeters,
  formatDurationSeconds,
  formatNumber,
} from '../../lib/set-record-measurement'
import type {
  ExerciseRecordDetail,
  ExerciseRecordMetricKind,
} from '../../db/sessions'

export function formatMetricValue(kind: ExerciseRecordMetricKind, value: number, t: TFunction) {
  if (kind === 'highestWeight') {
    return t('common.kg', { value: formatNumber(value) })
  }
  if (kind === 'maxReps') {
    return t('common.reps', { value: formatNumber(value) })
  }
  if (kind === 'longestDuration') {
    return formatDurationSeconds(value, t)
  }
  if (kind === 'longestDistance') {
    return formatDistanceMeters(value, t)
  }
  if (kind === 'loadDistanceVolume') {
    return t('summary.analytics.loadDistanceValue', { value: formatNumber(value) })
  }

  return t('summary.analytics.volumeValue', { value: formatNumber(value) })
}

export function formatTotalWork(detail: ExerciseRecordDetail, t: TFunction) {
  if (detail.measurementType === 'duration') {
    return formatDurationSeconds(detail.totalDurationSeconds, t)
  }
  if (detail.measurementType === 'distance') {
    return formatDistanceMeters(detail.totalDistanceMeters, t)
  }
  if (detail.measurementType === 'weightDistance') {
    return formatMetricValue('loadDistanceVolume', detail.totalVolume, t)
  }
  if (detail.measurementType === 'reps') {
    return t('common.reps', { value: detail.totalReps })
  }

  return formatMetricValue('weightRepsVolume', detail.totalVolume, t)
}

export function toDistributionInputs(distribution: MuscleDistributionItem[]) {
  const values = new Map(distribution.map((item) => [item.muscleGroupId, String(Math.round(item.ratio * 100))]))
  return Object.fromEntries(muscleGroups.map((groupId) => [groupId, values.get(groupId) ?? '']))
}

export function normalizeDistributionInputs(inputs: Record<string, string>) {
  const rawItems = muscleGroups
    .map((muscleGroupId) => ({
      muscleGroupId,
      value: Number(inputs[muscleGroupId]),
    }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
  const total = rawItems.reduce((sum, item) => sum + item.value, 0)

  if (total <= 0) {
    return []
  }

  return rawItems.map((item) => ({
    muscleGroupId: item.muscleGroupId,
    ratio: item.value / total,
  })) satisfies MuscleDistributionItem[]
}

export function createEqualMuscleDistribution(muscleGroupIds: MuscleGroup[]) {
  if (muscleGroupIds.length === 0) {
    return []
  }

  const ratio = 1 / muscleGroupIds.length
  return muscleGroupIds.map((muscleGroupId) => ({
    muscleGroupId,
    ratio,
  })) satisfies MuscleDistributionItem[]
}

export function normalizeMuscleDistribution(distribution: MuscleDistributionItem[]) {
  const total = distribution.reduce((sum, item) => sum + item.ratio, 0)

  if (total <= 0) {
    return []
  }

  return distribution.map((item) => ({
    muscleGroupId: item.muscleGroupId,
    ratio: item.ratio / total,
  })) satisfies MuscleDistributionItem[]
}
