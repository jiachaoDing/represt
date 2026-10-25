import { ReprestApi, ToolError } from './api.js'
import { analyticsInput, snapshotSchema, type AnalyticsInput, type TrainingSnapshot } from './analytics-schema.js'
import { normalizeName, prepareFacts, type Fact } from './analytics-data.js'
import { bests, bucketDate, dayMs, exerciseInfo, groupBy, nextBucket, progress, shiftDate, totals } from './analytics-metrics.js'

export async function queryTrainingAnalytics(api: ReprestApi, input: AnalyticsInput) {
  // One immutable backup avoids inter-table/page races and repeated R2 snapshot downloads.
  const snapshot = await api.request(`/api/account/data?version=${input.version}`, snapshotSchema)
  if (snapshot.version !== input.version) throw new ToolError('VERSION_CONFLICT', 'Read the latest program version and restart the aggregate query.')
  return aggregateTraining(snapshot, input)
}

export function aggregateTraining(snapshot: TrainingSnapshot, request: AnalyticsInput) {
  const input = analyticsInput.parse(request)
  if (!snapshot.syncedAt) throw new ToolError('SYNC_REQUIRED', 'No synchronized snapshot time exists. Ask the user to Sync in Represt.')
  if (snapshot.version !== input.version) throw new ToolError('VERSION_CONFLICT', 'Restart at the current program version.')
  const { facts, sessions, plannedItems, warnings, warn } = prepareFacts(snapshot)
  warn('SYNC_SNAPSHOT_ONLY', 'Only the last manually synced snapshot is visible. Unrecorded or unsynced activity cannot be inferred.')
  const inRange = (date: string) => date >= input.from && date <= input.to
  const allDates = [...new Set(facts.map((f) => f.session.sessionDateKey))].sort()
  let matching = facts.filter((f) => inRange(f.session.sessionDateKey) && (!input.sessionId || f.session.id === input.sessionId))
  if (input.exerciseKey) matching = matching.filter((f) => f.exerciseKey === input.exerciseKey)
  if (input.exerciseName) {
    const name = normalizeName(input.exerciseName)
    const identities = new Set(facts.filter((f) => normalizeName(f.exercise.name) === name).map((f) => f.exerciseKey))
    if (identities.size > 1) throw new ToolError('AMBIGUOUS_EXERCISE', 'This name matches multiple exercise identities. Use exerciseKey from volume/history results.')
    matching = matching.filter((f) => identities.has(f.exerciseKey))
  }
  if (input.muscleGroup) matching = matching.filter((f) => f.distribution?.some((d) => d.muscleGroupId === input.muscleGroup))
  const matchedSessions = groupBy(matching, (f) => f.session.id)
  const trainingDates = [...new Set(matching.map((f) => f.session.sessionDateKey))].sort()
  const scope = { sessions: matchedSessions.size, trainingDays: trainingDates.length, ...totals(matching) }
  let status: 'ok' | 'no_matching_data' | 'insufficient_history' = matching.length ? 'ok' : 'no_matching_data'
  let summary: Record<string, unknown> = scope
  let items: Record<string, unknown>[] = []
  // A measurement change splits a series instead of comparing incompatible values.
  const byExercise = (records: Fact[]) => groupBy(records, (f) => `${f.exerciseKey}\0${f.measurementType}`)
  const period = (date: string) => {
    const end = shiftDate(nextBucket(date, input.bucket), -1)
    return { bucketStart: date, bucketEnd: end, from: date < input.from ? input.from : date,
      to: end > input.to ? input.to : end, partial: date < input.from || end > input.to }
  }
  if (input.query === 'overview') {
    const actualSessionIds = new Set(facts.map((f) => f.session.id))
    const rangeSessions = [...sessions.values()].filter((s) => inRange(s.sessionDateKey) && (!input.sessionId || s.id === input.sessionId))
    const rangeIds = new Set(rangeSessions.map((s) => s.id))
    const targets = [...plannedItems.values()].filter((p) => rangeIds.has(p.sessionId))
    summary = { ...scope, exerciseCount: byExercise(matching).size,
      firstTrainingDate: trainingDates[0] ?? null, lastTrainingDate: trainingDates.at(-1) ?? null,
      emptySessions: rangeSessions.filter((s) => !actualSessionIds.has(s.id)).length,
      planned: { scope: 'all sessionPlanItems in the requested sessions; independent of exercise/muscle filters',
        items: targets.length, knownTargetSets: targets.filter((p) => p.targetSets !== undefined).reduce((sum, p) => sum + p.targetSets!, 0),
        itemsMissingTargets: targets.filter((p) => p.targetSets === undefined).length },
    }
  }
  if (input.query === 'history') {
    items = [...matchedSessions].sort(([a, ar], [b, br]) => br[0].session.sessionDateKey.localeCompare(ar[0].session.sessionDateKey) || a.localeCompare(b))
      .map(([sessionId, records]) => ({ sessionId, date: records[0].session.sessionDateKey,
        plannedPlanNameSnapshot: records[0].session.plannedPlanNameSnapshot ?? null,
        hasRecordedTraining: true, ...totals(records),
        exercises: [...byExercise(records).values()].map((rows) => ({ ...exerciseInfo(rows), ...totals(rows), best: bests(rows) })),
      }))
  }
  if (input.query === 'frequency') {
    const gaps = trainingDates.slice(1).map((date, i) => (Date.parse(date) - Date.parse(trainingDates[i])) / dayMs)
    const mean = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null
    const deviation = mean === null ? null : Math.sqrt(gaps.reduce((sum, value) => sum + (value - mean) ** 2, 0) / gaps.length)
    const bucketGroups = groupBy(matching, (f) => bucketDate(f.session.sessionDateKey, input.bucket))
    for (let date = bucketDate(input.from, input.bucket); date <= input.to; date = nextBucket(date, input.bucket)) {
      const records = bucketGroups.get(date) ?? []
      items.push({ ...period(date), sessions: new Set(records.map((f) => f.session.id)).size,
        trainingDays: new Set(records.map((f) => f.session.sessionDateKey)).size, completedSets: records.length })
    }
    const complete = items.filter((p) => !p.partial)
    summary = { ...scope, meanGapDays: mean, gapStandardDeviationDays: deviation,
      gapCoefficientOfVariation: mean && deviation !== null ? deviation / mean : null,
      completeBuckets: complete.length, interpretation: 'Zero buckets mean no synced recorded sets; they do not prove missed workouts. Compare complete buckets only; no clinical stability threshold is inferred.' }
    if (matching.length && (gaps.length < 2 || complete.length < 2)) status = 'insufficient_history'
  }
  if (input.query === 'volume') {
    items = [...groupBy(matching, (f) => bucketDate(f.session.sessionDateKey, input.bucket))].sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([date, records]) => [...byExercise(records).values()].map((rows) => ({ ...period(date),
        ...exerciseInfo(rows), ...totals(rows), best: bests(rows) })))
  }
  if (input.query === 'muscle_distribution') {
    warn('MUSCLE_MODEL', 'Muscle ratios are classification estimates, not physiological measurements. Profile overrides use current synced classifications; catalog fallback uses packaged application classifications.')
    items = [...groupBy(matching, (f) => bucketDate(f.session.sessionDateKey, input.bucket))].sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([date, records]) => {
        const muscles = [...new Set(records.flatMap((f) => f.distribution?.map((d) => d.muscleGroupId) ?? ['unknown']))].sort()
        return muscles.map((muscleGroup) => {
          const ratio = (f: Fact) => f.distribution?.find((d) => d.muscleGroupId === muscleGroup)?.ratio ?? (muscleGroup === 'unknown' && !f.distribution ? 1 : 0)
          const rows = records.filter((f) => ratio(f) > 0)
          const weightedSets = rows.reduce((sum, f) => sum + ratio(f), 0)
          return { ...period(date), muscleGroup, weightedSets, setShare: weightedSets / records.length,
            weightedMetrics: totals(rows, ratio), classificationSources: [...new Set(rows.map((f) => f.distributionSource))] }
        })
      })
  }
  if (input.query === 'personal_records') {
    summary = { ...scope, recordScope: 'Best observed single-set metrics within from/to, not necessarily lifetime records.' }
    items = [...byExercise(matching).values()].map((rows) => ({ ...exerciseInfo(rows), best: bests(rows) }))
  }
  if (input.query === 'exercise_progress' || input.query === 'plateaus') {
    const series = [...byExercise(matching).values()].map(progress)
    if (input.query === 'exercise_progress') {
      items = series.flatMap(({ points, summary: detail }) => points.map((point) => ({ ...detail, ...point })))
      summary = { ...scope, series: series.map((s) => s.summary) }
      if (matching.length && !series.some((s) => s.summary.sufficient)) status = 'insufficient_history'
    } else {
      let eligible = 0
      for (const seriesItem of series) {
        const observed = seriesItem.points.filter((p) => p.value !== null)
        if (observed.length < input.minTrainingDays) continue
        const first = observed[0]
        const last = observed.at(-1)!
        const spanDays = (Date.parse(last.date) - Date.parse(first.date)) / dayMs
        if (spanDays < input.minSpanDays) continue
        eligible++
        // Screen for no observed improvement beyond the first day's best, not a diagnosis.
        if (observed.slice(1).some((p) => p.value! > first.value!)) continue
        items.push({ ...seriesItem.summary, firstDate: first.date, lastDate: last.date, spanDays,
          criterion: 'No later observed training-day best exceeded the first day in this range.' })
      }
      summary = { ...scope, evaluatedSeries: series.length, eligibleSeries: eligible, excludedInsufficientSeries: series.length - eligible,
        minTrainingDays: input.minTrainingDays, minSpanDays: input.minSpanDays,
        interpretation: 'A screening signal using the primary metric only; not proof of a plateau, adherence or recovery problems.' }
      if (matching.length && !eligible) status = 'insufficient_history'
    }
  }
  if (input.query !== 'history' && input.query !== 'frequency' && input.query !== 'muscle_distribution') {
    items.sort((a, b) => String(a.bucketStart ?? a.date ?? '').localeCompare(String(b.bucketStart ?? b.date ?? '')) ||
      String(a.exerciseKey ?? '').localeCompare(String(b.exerciseKey ?? '')) || String(a.measurementType ?? '').localeCompare(String(b.measurementType ?? '')))
  }
  const total = items.length
  return { query: input.query, version: snapshot.version, syncedAt: snapshot.syncedAt,
    schemaVersion: snapshot.backup.schemaVersion, exportedAt: snapshot.backup.exportedAt,
    range: { from: input.from, to: input.to, dateBasis: 'sessionDateKey' as const, weekStartsOn: 'Monday' as const },
    status, coverage: { firstTrainingDate: allDates[0] ?? null, lastTrainingDate: allDates.at(-1) ?? null,
      matchedSessions: matchedSessions.size, matchedSets: matching.length },
    warnings: [...warnings.values()], summary, items: items.slice(input.offset, input.offset + input.limit), total,
    nextOffset: input.offset + input.limit < total ? input.offset + input.limit : null }
}
