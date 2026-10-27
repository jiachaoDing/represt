import { metricUnits, type Fact, type Measurement, type Metric } from './analytics-data.js'

export const dayMs = 86400000
export const shiftDate = (date: string, days: number) => new Date(Date.parse(date) + days * dayMs).toISOString().slice(0, 10)
export function bucketDate(date: string, bucket: 'day' | 'week' | 'month') {
  if (bucket === 'day') return date
  if (bucket === 'month') return `${date.slice(0, 7)}-01`
  return shiftDate(date, -((new Date(date).getUTCDay() + 6) % 7))
}
export function nextBucket(date: string, bucket: 'day' | 'week' | 'month') {
  if (bucket !== 'month') return shiftDate(date, bucket === 'day' ? 1 : 7)
  const next = new Date(date)
  next.setUTCMonth(next.getUTCMonth() + 1)
  return next.toISOString().slice(0, 10)
}
export function groupBy<T>(values: T[], key: (value: T) => string) {
  const groups = new Map<string, T[]>()
  for (const value of values) {
    const id = key(value)
    const current = groups.get(id)
    if (current) current.push(value)
    else groups.set(id, [value])
  }
  return groups
}
const totalKeys = ['reps', 'durationSeconds', 'distanceMeters', 'weightRepsKg', 'loadDistanceKgMeters'] as const
export function totals(facts: Fact[], ratio: (fact: Fact) => number = () => 1) {
  const result = { completedSets: facts.length,
    reps: null as number | null, durationSeconds: null as number | null, distanceMeters: null as number | null,
    weightRepsKg: null as number | null, loadDistanceKgMeters: null as number | null,
    observedSets: { reps: 0, durationSeconds: 0, distanceMeters: 0, weightRepsKg: 0, loadDistanceKgMeters: 0 } }
  for (const fact of facts) for (const key of totalKeys) {
    const value = fact.values[key]
    if (value !== undefined) {
      result[key] = (result[key] ?? 0) + value * ratio(fact)
      result.observedSets[key]++
    }
  }
  for (const key of totalKeys) if (result[key] !== null && !Number.isFinite(result[key])) result[key] = null
  return result
}
export function bests(facts: Fact[]) {
  const best = new Map<Metric, { metric: Metric; unit: string; value: number; setRecordId: string;
    sessionId: string; sessionDateKey: string; completedAt: string }>()
  for (const fact of facts) for (const metric of Object.keys(fact.values) as Metric[]) {
    const reps = [fact.set.reps, fact.set.rightReps].filter((v): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0)
    const value = metric === 'reps' && fact.measurementType === 'leftRightWeightReps'
      ? reps.reduce((sum, count) => sum + count, 0) / reps.length : fact.values[metric]!
    const previous = best.get(metric)
    if (!previous || value > previous.value || (value === previous.value && Date.parse(fact.set.completedAt) > Date.parse(previous.completedAt))) {
      best.set(metric, { metric, unit: metricUnits[metric], value, setRecordId: fact.set.id,
        sessionId: fact.session.id, sessionDateKey: fact.session.sessionDateKey, completedAt: fact.set.completedAt })
    }
  }
  return [...best.values()]
}
export const primaryMetric = (measurement: Measurement): Metric | null => ({
  weightReps: 'weightKg', reps: 'reps', duration: 'durationSeconds', distance: 'distanceMeters',
  weightDistance: 'loadDistanceKgMeters', unknown: null,
  leftRightWeightReps: 'weightKg', durationReps: 'durationSeconds',
})[measurement] as Metric | null

export const comparisonMeasurement = (measurement: Measurement) => measurement === 'leftRightWeightReps' ? 'weightReps' : measurement

export function exerciseInfo(facts: Fact[]) {
  const fact = facts[0]
  return { exerciseKey: fact.exerciseKey, name: fact.exercise.name, catalogExerciseId: fact.exercise.catalogExerciseId ?? null,
    measurementType: fact.measurementType }
}
export function progress(facts: Fact[]) {
  const metric = primaryMetric(facts[0].measurementType)
  const points = [...groupBy(facts, (f) => f.session.sessionDateKey)].sort(([a], [b]) => a.localeCompare(b)).map(([date, records]) => ({
    date, ...totals(records), best: bests(records),
    value: metric ? bests(records).find((b) => b.metric === metric)?.value ?? null : null,
  }))
  const observed = points.filter((p): p is typeof p & { value: number } => p.value !== null)
  const first = observed[0]
  const last = observed.at(-1)
  const sufficient = observed.length >= 2
  return { points, summary: { ...exerciseInfo(facts), metric, unit: metric ? metricUnits[metric] : null,
    observedTrainingDays: observed.length, sufficient,
    firstValue: first?.value ?? null, latestValue: last?.value ?? null,
    delta: sufficient ? last!.value - first.value : null,
    changePercent: sufficient && first.value !== 0 ? (last!.value - first.value) / first.value * 100 : null,
  } }
}
