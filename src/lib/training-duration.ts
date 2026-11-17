import { getActiveDurationSummary } from '../db/session-summary'
import { getTrainingTimeBucket, trainingTimeBucketOrder } from '../db/summary-analytics'
import type { SessionSummaryTimeSegment } from '../db/session-types'
import type { SetRecord } from '../models/types'
import { addDaysToSessionDateKey } from './session-date-key'

export type TrainingDurationPoint = {
  dateKey: string
  minutes: number
  recordCount: number
  segments: SessionSummaryTimeSegment[]
}

export function buildTrainingDurations(recordsByDate: ReadonlyMap<string, SetRecord[]>) {
  return [...recordsByDate].map(([dateKey, records]) => {
    const timing = getActiveDurationSummary(records)
    return { dateKey, minutes: timing.activeDurationMinutes ?? 0,
      recordCount: records.length, segments: timing.trainingTimeSegments }
  }).sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

export function compareTrainingDuration(points: TrainingDurationPoint[], today: string) {
  const current = points.find((point) => point.dateKey === today) ?? null
  const start = addDaysToSessionDateKey(today, -28)
  const recent = points.filter((point) => point.dateKey >= start && point.dateKey < today && point.minutes > 0).slice(-6)
  const values = recent.map((point) => point.minutes).sort((a, b) => a - b)
  const middle = Math.floor(values.length / 2)
  const baseline = values.length >= 3
    ? values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2
    : null
  if (!current) return { current, baseline, sampleCount: recent.length, status: 'empty' as const }
  if (baseline === null || current.minutes === 0) {
    return { current, baseline, sampleCount: recent.length, status: 'insufficient' as const }
  }
  const tolerance = Math.max(5, baseline * 0.1)
  const difference = current.minutes - baseline
  const status = Math.abs(difference) <= tolerance ? 'similar' : difference > 0 ? 'higher' : 'lower'
  return { current, baseline, sampleCount: recent.length, status }
}

export function getTrainingTimeDistribution(points: TrainingDurationPoint[]) {
  const daysByBucket = new Map(trainingTimeBucketOrder.map((bucket) => [bucket, new Set<string>()]))
  const trainingDays = new Set<string>()
  for (const point of points) {
    for (const segment of point.segments) {
      const bucket = getTrainingTimeBucket(segment.startedAt)
      if (!bucket) continue
      daysByBucket.get(bucket)!.add(point.dateKey)
      trainingDays.add(point.dateKey)
    }
  }
  const buckets = [...daysByBucket].map(([bucket, days]) => ({
    bucket, count: days.size, fraction: trainingDays.size ? days.size / trainingDays.size : 0,
  }))
  const maximum = Math.max(0, ...buckets.map((item) => item.count))
  return { buckets, primary: buckets.filter((item) => item.count > 0 && item.count === maximum) }
}
