import type { SessionPlanItem } from '../models/types'
import {
  calculateProgressionTargets,
  getEquipmentIncrementKg,
  getGuidanceTarget,
  getProgressionRepRange,
  type ProgressionConfig,
  type ProgressionHistory,
  type TrainingGuidance,
} from '../lib/progressive-overload'
import { getMeasurementTypeForExercise, getSetRecordMeasurementType } from '../lib/set-record-measurement'
import { db } from './app-db'

/** A catalog ID includes variant/equipment. Custom movements use their stable plan exercise ID. */
function matchesExercise(current: SessionPlanItem, previous: { catalogExerciseId?: string | null; planExerciseId: string | null }) {
  if (current.catalogExerciseId || previous.catalogExerciseId) {
    return !!current.catalogExerciseId && current.catalogExerciseId === previous.catalogExerciseId
  }
  return !!current.planExerciseId && current.planExerciseId === previous.planExerciseId
}

async function buildTrainingGuidance(item: SessionPlanItem): Promise<TrainingGuidance | null> {
  const measurementType = getMeasurementTypeForExercise(item)
  if (!['weightReps', 'reps', 'durationReps', 'leftRightWeightReps'].includes(measurementType)) return null
  const bilateral = measurementType === 'leftRightWeightReps'
  const session = await db.workoutSessions.get(item.sessionId)
  if (!session) return null
  const planExercise = item.planExerciseId ? await db.planExercises.get(item.planExerciseId) : null
  const defaultReps = item.defaultReps ?? planExercise?.reps ?? null
  const range = getProgressionRepRange(defaultReps)
  const config: ProgressionConfig = {
    ...range,
    targetSets: item.targetSets,
    defaultWeightKg: item.defaultWeightKg ?? planExercise?.weightKg ?? null,
    defaultReps,
    incrementKg: getEquipmentIncrementKg(item.catalogExerciseId),
    repsOnly: measurementType === 'reps' || measurementType === 'durationReps',
  }
  const candidates = await db.performedExercises.filter((entry) =>
    entry.sessionId !== item.sessionId && matchesExercise(item, entry) &&
    getMeasurementTypeForExercise(entry) === measurementType).toArray()
  const sessions = await db.workoutSessions.bulkGet(candidates.map((entry) => entry.sessionId))
  const seenSessions = new Set<string>()
  const previous = candidates.map((exercise, index) => ({ exercise, session: sessions[index] }))
    .filter((entry) => entry.session && entry.session.sessionDateKey < session.sessionDateKey)
    .sort((a, b) => b.session!.sessionDateKey.localeCompare(a.session!.sessionDateKey) ||
      b.exercise.startedAt.localeCompare(a.exercise.startedAt))
    .filter(({ exercise }) => {
      if (seenSessions.has(exercise.sessionId)) return false
      seenSessions.add(exercise.sessionId)
      return true
    })
    .slice(0, 2)
  const entries = await Promise.all(previous.map(async ({ exercise }) => {
    const records = await db.setRecords.where('performedExerciseId').equals(exercise.id).sortBy('setNumber')
    const planItem = exercise.planItemId ? await db.sessionPlanItems.get(exercise.planItemId) : null
    const snapshot = planItem?.trainingGuidance
    let warmupCount = 0
    return {
      targetSets: Math.max(exercise.targetSets, snapshot?.targets.length ?? exercise.sourcePlanSnapshot?.targetSets ?? 0),
      completed: exercise.completedSets >= exercise.targetSets,
      targets: snapshot?.targets.map((_, index) => getGuidanceTarget(snapshot, index + 1)),
      sets: records.map((record) => {
        if (record.kind === 'warmup') warmupCount++
        return {
          ...record,
          setNumber: record.setNumber - warmupCount,
          status: getSetRecordMeasurementType(record, measurementType) !== measurementType ||
            (bilateral && (record.rightWeightKg == null || record.rightReps == null))
            ? 'incomplete' as const : record.status,
        }
      }),
    }
  }))
  const history: ProgressionHistory[] = entries
  let targets = calculateProgressionTargets(config, history)
  const rightConfig = { ...config, defaultWeightKg: item.defaultRightWeightKg ?? planExercise?.rightWeightKg ?? null,
    defaultReps: item.defaultRightReps ?? planExercise?.rightReps ?? defaultReps }
  const rightHistory: ProgressionHistory[] = entries.map((entry) => ({ ...entry,
    targets: entry.targets?.map((target) => ({ weightKg: target.rightWeightKg ?? null, reps: target.rightReps ?? target.reps })),
    sets: entry.sets.map((set) => ({ ...set, weightKg: set.rightWeightKg ?? null, reps: set.rightReps ?? null })),
  }))
  let rightTargets = bilateral ? calculateProgressionTargets(rightConfig, rightHistory) : []
  if (bilateral && entries.length) {
    const direction = (next: number | null, previous: number | null | undefined) =>
      next != null && previous != null ? Math.sign(next - previous) : 0
    const leftDirection = direction(targets[0].weightKg, history[0].sets[0]?.weightKg)
    const rightDirection = direction(rightTargets[0].weightKg, rightHistory[0].sets[0]?.weightKg)
    // Both sides must earn the same load change; reps still progress independently.
    if (leftDirection !== rightDirection) {
      targets = calculateProgressionTargets({ ...config, allowLoadChange: false }, history)
      rightTargets = calculateProgressionTargets({ ...rightConfig, allowLoadChange: false }, rightHistory)
    }
  }
  return {
    measurementType,
    ...range,
    incrementKg: config.incrementKg,
    targets: targets.map((target, index) => bilateral ? {
      ...target,
      rightWeightKg: rightTargets[index].weightKg,
      rightReps: rightTargets[index].reps,
    } : target),
  }
}

/** Lazily persist a snapshot: existing installations need no table/index or data migration. */
async function ensureGuidanceSnapshot(item: SessionPlanItem) {
  const existing = item.trainingGuidance
  const measurementType = getMeasurementTypeForExercise(item)
  if (existing?.measurementType === measurementType) {
    if (existing.targets.length >= item.targetSets) return existing
    const targets = [...existing.targets]
    while (targets.length < item.targetSets) {
      targets.push({ ...targets[targets.length - 1], reps: existing.repMin,
        ...(measurementType === 'leftRightWeightReps' ? { rightReps: existing.repMin } : {}) })
    }
    const extended = { ...existing, targets }
    await db.sessionPlanItems.update(item.id, { trainingGuidance: extended })
    return extended
  }
  const guidance = await buildTrainingGuidance(item)
  if (guidance) {
    // Upgrading/resuming an existing workout must preserve the user's actual chosen load.
    const performed = await db.performedExercises.where('planItemId').equals(item.id).first()
    const records = performed ? await db.setRecords.where('performedExerciseId').equals(performed.id).sortBy('setNumber') : []
    const latest = records.filter((record) => record.kind !== 'warmup' &&
      (record.status ?? 'completed') === 'completed' &&
      getSetRecordMeasurementType(record, measurementType) === measurementType).at(-1)
    if (latest && (measurementType === 'weightReps' || measurementType === 'leftRightWeightReps')) {
      guidance.manualWeightKg = latest.weightKg
      if (measurementType === 'leftRightWeightReps') guidance.manualRightWeightKg = latest.rightWeightKg
    }
    await db.sessionPlanItems.update(item.id, { trainingGuidance: guidance })
  }
  return guidance
}

export async function ensureTrainingGuidance(item: SessionPlanItem) {
  // Serialize snapshot creation with completion/manual edits, including notification actions.
  return db.transaction('rw', [db.sessionPlanItems, db.performedExercises, db.setRecords, db.workoutSessions, db.planExercises], async () => {
    const current = await db.sessionPlanItems.get(item.id)
    return current ? ensureGuidanceSnapshot(current) : null
  })
}

export { getGuidanceTarget }
