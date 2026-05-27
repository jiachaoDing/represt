import type { TFunction } from 'i18next'

import type {
  SessionSummaryDetail,
  SessionSummaryTimeSegment,
  SummaryMetricKind,
  SummaryRangeAnalytics,
  SummaryRecordHighlight,
} from '../db/sessions'
import { getDisplayExerciseName } from './exercise-name'
import {
  formatDistanceMeters,
  formatDurationSeconds,
  formatNumber,
  formatSetRecordValue,
  getMeasurementTypeForExercise,
  getRecordSummaryParts,
} from './set-record-measurement'
import { formatSessionDateKey } from './session-date-key'

function formatTrainingDurationMinutes(minutes: number | null, t: TFunction) {
  if (minutes === null) {
    return '--'
  }

  if (minutes < 60) {
    return t('common.minutes', { value: minutes })
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes === 0
    ? t('common.hours', { value: hours })
    : t('common.hoursMinutes', { hours, minutes: remainingMinutes })
}

function formatSegmentTime(completedAt: string, locale: string) {
  const completedAtDate = new Date(completedAt)
  if (Number.isNaN(completedAtDate.getTime())) {
    return '--'
  }

  return completedAtDate.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTrainingTimeSegments(
  segments: SessionSummaryTimeSegment[],
  locale: string,
) {
  if (segments.length === 0) {
    return '--'
  }

  return segments
    .map((segment) => {
      const startedAt = formatSegmentTime(segment.startedAt, locale)
      const endedAt = formatSegmentTime(segment.endedAt, locale)

      return segment.startedAt === segment.endedAt ? startedAt : `${startedAt}-${endedAt}`
    })
    .join(' · ')
}

function formatMetricValue(kind: SummaryMetricKind, value: number, t: TFunction) {
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

function getMetricLabel(kind: SummaryMetricKind, t: TFunction) {
  return t(`summary.analytics.metrics.${kind}`)
}

function formatHighlight(item: SummaryRecordHighlight, t: TFunction) {
  const displayName = getDisplayExerciseName(t, {
    catalogExerciseId: item.catalogExerciseId,
    name: item.exerciseName,
  })
  const recordType = item.type === 'first' ? t('summary.analytics.firstRecord') : t('summary.analytics.pr')

  return `${displayName}: ${recordType} · ${getMetricLabel(item.metricKind, t)} · ${formatMetricValue(item.metricKind, item.value, t)}`
}

function joinLines(lines: string[]) {
  return lines.filter((line) => line.trim().length > 0).join('\n')
}

export function buildDaySummaryExportText(
  detail: SessionSummaryDetail,
  analytics: SummaryRangeAnalytics | null,
  t: TFunction,
  locale: string,
) {
  const dateLabel = formatSessionDateKey(detail.session.sessionDateKey, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }, locale)
  const completedSetCount = detail.exercises.reduce((acc, exercise) => acc + exercise.completedSets, 0)
  const lines = [
    `# ${t('summary.export.dayTitle', { date: dateLabel })}`,
    '',
    `- ${t('summary.totalCompletedSets')}: ${t('common.sets', { value: completedSetCount })}`,
    `- ${t('summary.trainingDuration')}: ${formatTrainingDurationMinutes(detail.activeDurationMinutes, t)}`,
    `- ${t('summary.export.trainingSegments')}: ${formatTrainingTimeSegments(detail.trainingTimeSegments, locale)}`,
  ]

  if (analytics && analytics.highlights.length > 0) {
    lines.push('', `## ${t('summary.analytics.highlights')}`)
    lines.push(...analytics.highlights.map((item) => `- ${formatHighlight(item, t)}`))
  }

  if (detail.exercises.length > 0) {
    lines.push('', `## ${t('summary.exerciseCompleted')}`)
    detail.exercises.forEach((exercise) => {
      const displayName = getDisplayExerciseName(t, exercise)
      const measurementType = getMeasurementTypeForExercise(exercise)
      const recordSummary = getRecordSummaryParts(exercise.setRecords, measurementType, t).join(' · ')

      lines.push(`- ${displayName}: ${t('common.sets', { value: exercise.completedSets })}`)
      if (recordSummary) {
        lines.push(`  - ${t('summary.export.recordSummary')}: ${recordSummary}`)
      }
      exercise.setRecords.forEach((setRecord, index) => {
        lines.push(`  - ${t('summary.setNumber', { setNumber: index + 1 })}: ${formatSetRecordValue(setRecord, measurementType, t)}`)
      })
    })
  }

  return joinLines(lines)
}

export function buildRangeSummaryExportText(
  analytics: SummaryRangeAnalytics,
  t: TFunction,
  locale: string,
) {
  const startLabel = formatSessionDateKey(analytics.startDateKey, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }, locale)
  const endLabel = formatSessionDateKey(analytics.endDateKey, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }, locale)
  const lines = [
    `# ${t('summary.export.monthTitle', { start: startLabel, end: endLabel })}`,
    '',
    `- ${t('summary.analytics.trainingDays')}: ${t('summary.analytics.daysValue', { value: analytics.trainingDays })}`,
    `- ${t('summary.analytics.completedSets')}: ${t('common.sets', { value: analytics.completedSets })}`,
    `- ${t('summary.analytics.exerciseCount')}: ${t('summary.exerciseCount', { count: analytics.exerciseCount })}`,
    `- ${t('summary.analytics.totalTrainingDuration')}: ${formatTrainingDurationMinutes(analytics.totalActiveDurationMinutes, t)}`,
    `- ${t('summary.analytics.averageTrainingDuration')}: ${formatTrainingDurationMinutes(analytics.averageActiveDurationMinutes, t)}`,
    `- ${t('summary.analytics.trainingSegmentCount')}: ${t('summary.analytics.trainingSegmentCountValue', { value: analytics.trainingSegmentCount })}`,
    `- ${t('summary.analytics.preferredTrainingTime')}: ${
      analytics.preferredTrainingTimeBucket
        ? t(`summary.analytics.timeBuckets.${analytics.preferredTrainingTimeBucket}`)
        : '--'
    }`,
  ]

  return joinLines(lines)
}
