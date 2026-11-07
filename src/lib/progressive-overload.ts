// Double progression, informed by FitnessTrack's pure-function algorithm:
// https://github.com/Gman0909/FitnessTrack/blob/master/shared/algorithm.js
// RepRest gates load changes on the whole exercise, never on an individual set.
export interface ProgressionTarget {
  weightKg: number | null
  reps: number
  rightWeightKg?: number | null
  rightReps?: number
}

export interface TrainingGuidance {
  measurementType: string
  repMin: number
  repMax: number
  incrementKg: number
  targets: ProgressionTarget[]
  manualWeightKg?: number | null
  manualRightWeightKg?: number | null
}

export interface ProgressionSet {
  setNumber: number
  weightKg: number | null
  reps: number | null
  status?: 'completed' | 'skipped' | 'incomplete'
  kind?: 'working' | 'warmup'
}

export interface ProgressionHistory {
  targetSets: number
  completed: boolean
  sets: ProgressionSet[]
  targets?: ProgressionTarget[]
}

export interface ProgressionConfig {
  targetSets: number
  defaultWeightKg: number | null
  defaultReps: number | null
  repMin: number
  repMax: number
  incrementKg: number
  repsOnly: boolean
  allowLoadChange?: boolean
}

export function getProgressionRepRange(defaultReps?: number | null) {
  const reps = defaultReps && Number.isFinite(defaultReps) ? Math.max(1, Math.floor(defaultReps)) : 10
  return reps >= 8 && reps <= 12
    ? { repMin: 8, repMax: 12 }
    : { repMin: Math.max(1, reps - 2), repMax: reps + 2 }
}

export function getEquipmentIncrementKg(catalogExerciseId?: string | null) {
  // Catalog IDs identify the equipment/variant; display names are never parsed.
  const id = catalogExerciseId ?? ''
  if (/barbell|smithMachine|ezBar/i.test(id) || [
    'deadlift', 'romanianDeadlift', 'sumoDeadlift', 'frontSquat', 'boxSquat',
    'lunge', 'shrug', 'preacherCurl', 'closeGripBenchPress', 'skullCrusher',
  ].includes(id)) return 5 // total barbell load: add 2.5 kg to each side
  return 2.5 // each dumbbell/recorded side; default for other equipment
}

const validReps = (value: number | null): value is number =>
  value !== null && Number.isInteger(value) && value >= 0
const validWeight = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value >= 0
const sameWeight = (a: number | null, b: number | null) => a === b ||
  (a !== null && b !== null && Math.abs(a - b) < 0.001)

function workingSets(history: ProgressionHistory) {
  return history.sets.filter((set) => set.kind !== 'warmup')
}

function completeSets(history: ProgressionHistory, config: ProgressionConfig) {
  const sets = workingSets(history)
  return history.completed && history.targetSets === config.targetSets &&
    sets.length === config.targetSets &&
    Array.from({ length: config.targetSets }, (_, index) => index + 1).every((number) =>
      sets.filter((set) => set.setNumber === number &&
        (set.status ?? 'completed') === 'completed' && validReps(set.reps) &&
        (config.repsOnly || validWeight(set.weightKg))).length === 1)
}

function uniformWeight(history: ProgressionHistory, config: ProgressionConfig) {
  const sets = workingSets(history)
  return completeSets(history, config) && sets.every((set) => sameWeight(set.weightKg, sets[0].weightKg))
}

/** History is newest first. Missing/skipped/interrupted sessions never earn a load change. */
export function calculateProgressionTargets(
  config: ProgressionConfig,
  history: ProgressionHistory[] = [],
): ProgressionTarget[] {
  const initial = Array.from({ length: config.targetSets }, () => ({
    weightKg: config.repsOnly ? null : config.defaultWeightKg,
    reps: config.defaultReps ?? config.repMin,
  }))
  const latest = history[0]
  if (!latest) return initial
  const sets = workingSets(latest)
  const recorded = sets.filter((set) => (set.status ?? 'completed') === 'completed' &&
    validReps(set.reps) && (config.repsOnly || validWeight(set.weightKg)))
  // A mixed-load workout can establish a conservative common load, but cannot earn a bump.
  const weights = recorded.flatMap((set) => validWeight(set.weightKg) ? [set.weightKg] : [])
  const weightKg = config.repsOnly ? null : weights.length ? Math.min(...weights) :
    latest.targets?.[0]?.weightKg ?? config.defaultWeightKg
  const complete = completeSets(latest, config)
  const uniform = uniformWeight(latest, config)
  const allAtCeiling = uniform && sets.every((set) => set.reps! >= config.repMax)
  const majorityMissed = (entry: ProgressionHistory) => uniformWeight(entry, config) &&
    workingSets(entry).filter((set) => set.reps! < config.repMin).length > config.targetSets / 2
  const prior = history[1]
  const shouldDeload = prior && majorityMissed(latest) && majorityMissed(prior) &&
    sameWeight(workingSets(prior)[0].weightKg, weightKg)
  if (config.allowLoadChange !== false && !config.repsOnly && weightKg !== null && weightKg > 0 && (allAtCeiling || shouldDeload)) {
    const step = config.incrementKg
    const nextWeight = allAtCeiling ? weightKg + step :
      Math.max(0, weightKg - Math.max(step, Math.round(weightKg * 0.05 / step) * step))
    if (nextWeight !== weightKg && nextWeight > 0) {
      return initial.map(() => ({ weightKg: Number(nextWeight.toFixed(3)), reps: config.repMin }))
    }
  }
  return initial.map((fallback, index) => {
    const previousTarget = latest.targets?.[index] ?? fallback
    const matches = recorded.filter((set) => set.setNumber === index + 1)
    const set = matches.length === 1 ? matches[0] : null
    const comparable = set && (config.repsOnly || sameWeight(set.weightKg, weightKg))
    // An incomplete workout holds targets; completed workouts climb each corresponding set.
    const reps = complete && comparable
      ? Math.max(config.repMin, Math.min(config.repMax, set.reps! < config.repMin ? config.repMin : set.reps! + 1))
      : previousTarget.reps
    return { weightKg, reps }
  })
}

export function getGuidanceTarget(guidance: TrainingGuidance, setNumber: number): ProgressionTarget {
  const target = guidance.targets[Math.min(Math.max(0, setNumber - 1), guidance.targets.length - 1)]
  return {
    ...target,
    ...(guidance.manualWeightKg !== undefined ? { weightKg: guidance.manualWeightKg } : {}),
    ...(guidance.manualRightWeightKg !== undefined ? { rightWeightKg: guidance.manualRightWeightKg } : {}),
  }
}
