import { type Fact, type Session, prepareFacts } from './analytics-data.js'
import { comparisonMeasurement, exerciseInfo, groupBy, totals } from './analytics-metrics.js'

type Prepared = ReturnType<typeof prepareFacts>
const seriesKey = (f: Fact) => `${f.exerciseKey}\0${comparisonMeasurement(f.measurementType)}`
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null
const setDetails = (facts: Fact[]) => [...facts].sort((a, b) =>
  (finite(a.set.setNumber) ?? Infinity) - (finite(b.set.setNumber) ?? Infinity) ||
  Date.parse(a.set.completedAt) - Date.parse(b.set.completedAt) || a.set.id.localeCompare(b.set.id))
  .map((f) => ({ id: f.set.id, performedExerciseId: f.exercise.id, planItemId: f.exercise.planItemId ?? null,
    setNumber: finite(f.set.setNumber), completedAt: f.set.completedAt,
    weightKg: f.values.weightKg ?? null, reps: f.values.reps ?? null,
    durationSeconds: f.values.durationSeconds ?? null, distanceMeters: f.values.distanceMeters ?? null }))

export function metricDelta(current: ReturnType<typeof totals>, previous: ReturnType<typeof totals>) {
  const keys = ['completedSets', 'reps', 'durationSeconds', 'distanceMeters', 'weightRepsKg', 'loadDistanceKgMeters'] as const
  return Object.fromEntries(keys.map((key) => [key,
    current[key] !== null && previous[key] !== null ? current[key]! - previous[key]! : null]))
}

export function workoutSummaries(prepared: Prepared, from: string, to: string, sessionId?: string) {
  const { facts, sessions, plannedItems, warn } = prepared
  const bySession = groupBy(facts, (f) => f.session.id)
  const itemsBySession = groupBy([...plannedItems.values()], (p) => p.sessionId)
  const seriesBySession = new Map([...bySession].map(([id, rows]) => [id, groupBy(rows, seriesKey)]))
  const signature = (id: string) => JSON.stringify([...(seriesBySession.get(id)?.keys() ?? [])].sort())
  // Build once; look up the latest earlier actual session by binary search, not per-set scans.
  const byType = new Map<string, Session[]>()
  const typeKey = (s: Session) => s.plannedPlanId ? `plan:${s.plannedPlanId}` : `exercises:${signature(s.id)}`
  for (const s of sessions.values()) if (bySession.has(s.id)) {
    const key = typeKey(s)
    const list = byType.get(key) ?? []
    list.push(s); byType.set(key, list)
  }
  for (const list of byType.values()) list.sort((a, b) => a.sessionDateKey.localeCompare(b.sessionDateKey) || a.id.localeCompare(b.id))
  return [...sessions.values()].filter((s) => s.sessionDateKey >= from && s.sessionDateKey <= to && (!sessionId || s.id === sessionId))
    .sort((a, b) => b.sessionDateKey.localeCompare(a.sessionDateKey) || a.id.localeCompare(b.id))
    .map((session) => {
      const rows = bySession.get(session.id) ?? []
      const targets = itemsBySession.get(session.id) ?? []
      const completedByItem = groupBy(rows.filter((f) => !!f.exercise.planItemId), (f) => f.exercise.planItemId!)
      let credited = 0
      let knownTargetSets = 0
      const planItems = targets.map((item) => {
        const completedSets = completedByItem.get(item.id)?.length ?? 0
        if (item.targetSets !== undefined) {
          knownTargetSets += item.targetSets
          credited += Math.min(completedSets, item.targetSets)
        }
        return { id: item.id, name: item.name ?? null, planExerciseId: item.planExerciseId ?? null,
          targetSets: item.targetSets ?? null, completedSets,
          defaults: { weightKg: finite(item.defaultWeightKg), reps: finite(item.defaultReps),
            durationSeconds: finite(item.defaultDurationSeconds), distanceMeters: finite(item.defaultDistanceMeters) } }
      })
      const missingTargets = targets.filter((p) => p.targetSets === undefined).length
      if (!targets.length || missingTargets) warn('INCOMPLETE_TARGETS', 'Completion rate is unknown when historical session targets are absent or incomplete.')
      const targetIds = new Set(targets.map((p) => p.id))
      const unplannedSets = rows.filter((f) => !targetIds.has(f.exercise.planItemId ?? '')).length
      const list = byType.get(typeKey(session)) ?? []
      let low = 0; let high = list.length
      while (low < high) {
        const mid = (low + high) >>> 1
        if (list[mid].sessionDateKey < session.sessionDateKey) low = mid + 1
        else high = mid
      }
      const previous = rows.length ? list[low - 1] : undefined
      if (rows.length && !previous) warn('NO_COMPARABLE_SESSION', 'No earlier actual session with the same plan identity or exact exercise signature exists in the synced snapshot.')
      const previousRows = previous ? bySession.get(previous.id)! : []
      const previousSeries = previous ? seriesBySession.get(previous.id)! : new Map<string, Fact[]>()
      const actual = totals(rows)
      const previousTotals = previous ? totals(previousRows) : null
      const exercises = [...(seriesBySession.get(session.id)?.entries() ?? [])].map(([key, records]) => {
        const old = previousSeries.get(key)
        const currentTotals = totals(records)
        const oldTotals = old ? totals(old) : null
        return { ...exerciseInfo(records), ...currentTotals, sets: setDetails(records),
          previous: old && oldTotals ? { ...oldTotals, sets: setDetails(old), delta: metricDelta(currentTotals, oldTotals) } : null }
      })
      return { sessionId: session.id, date: session.sessionDateKey, plannedPlanId: session.plannedPlanId ?? null,
        plannedPlanNameSnapshot: session.plannedPlanNameSnapshot ?? null, hasRecordedTraining: rows.length > 0,
        ...actual, planItems, completion: { basis: 'historical sessionPlanItems; capped per item; extra sets do not cover other items',
          knownTargetSets, creditedSets: credited, itemsMissingTargets: missingTargets, unplannedSets,
          rate: targets.length && !missingTargets && knownTargetSets > 0 ? credited / knownTargetSets : null },
        exercises, previous: previous ? { sessionId: previous.id, date: previous.sessionDateKey,
          matchBasis: session.plannedPlanId ? 'plannedPlanId' : 'exact exercise identities and measurement types',
          ...previousTotals!, delta: metricDelta(actual, previousTotals!),
          removedExercises: [...previousSeries].filter(([key]) => !seriesBySession.get(session.id)?.has(key)).map(([, records]) => exerciseInfo(records)) } : null }
    })
}
