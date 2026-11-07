import type {
  MeasurementType,
  MovementPattern,
  MuscleDistributionItem,
  ExerciseMetadata,
  LoadMode,
} from '../domain/exercise-catalog'

export interface ExerciseReference {
  exerciseProfileId?: string | null
  loadMode?: LoadMode | null
}

export type SessionStatus = 'pending' | 'active' | 'completed'

export type RestTimerStatus = 'idle' | 'running' | 'ready'

export interface WorkoutPlan {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface TrainingCycleSlot {
  id: string
  planId: string | null
}

export interface TrainingCycle {
  id: string
  slots: TrainingCycleSlot[]
  anchorDateKey: string
  anchorIndex: number
  updatedAt: string
}

export interface PlanExercise extends ExerciseReference {
  id: string
  planId: string
  name: string
  catalogExerciseId?: string | null
  measurementType?: MeasurementType | null
  targetSets: number
  restSeconds: number
  weightKg?: number | null
  reps?: number | null
  rightWeightKg?: number | null
  rightReps?: number | null
  durationSeconds?: number | null
  distanceMeters?: number | null
  order: number
}

export interface WorkoutSession {
  id: string
  sessionDateKey: string
  createdAt: string
  plannedPlanId?: string | null
  plannedPlanNameSnapshot?: string | null
  plannedPlanSelectedAt?: string | null
  lastSyncedPlanUpdatedAt?: string | null
}

export interface SessionPlanExerciseSnapshot extends ExerciseReference {
  name: string
  catalogExerciseId?: string | null
  measurementType?: MeasurementType | null
  targetSets: number
  defaultWeightKg?: number | null
  defaultReps?: number | null
  defaultRightWeightKg?: number | null
  defaultRightReps?: number | null
  defaultDurationSeconds?: number | null
  defaultDistanceMeters?: number | null
  restSeconds: number
  order: number
}

export interface SessionPlanItem extends ExerciseReference {
  id: string
  sessionId: string
  planExerciseId: string | null
  sourcePlanId?: string | null
  sourcePlanSnapshot?: SessionPlanExerciseSnapshot | null
  origin?: 'plan' | 'manual'
  name: string
  catalogExerciseId?: string | null
  measurementType?: MeasurementType | null
  targetSets: number
  defaultWeightKg?: number | null
  defaultReps?: number | null
  defaultRightWeightKg?: number | null
  defaultRightReps?: number | null
  defaultDurationSeconds?: number | null
  defaultDistanceMeters?: number | null
  restSeconds: number
  order: number
  createdAt: string
}

export interface PerformedExercise extends ExerciseReference {
  id: string
  sessionId: string
  planItemId: string | null
  planExerciseId: string | null
  sourcePlanId?: string | null
  sourcePlanSnapshot?: SessionPlanExerciseSnapshot | null
  origin?: 'plan' | 'manual'
  name: string
  catalogExerciseId?: string | null
  measurementType?: MeasurementType | null
  targetSets: number
  defaultWeightKg?: number | null
  defaultReps?: number | null
  defaultRightWeightKg?: number | null
  defaultRightReps?: number | null
  defaultDurationSeconds?: number | null
  defaultDistanceMeters?: number | null
  completedSets: number
  restSeconds: number
  order: number
  startedAt: string
  lastCompletedAt: string | null
  restEndsAt: string | null
}

export interface SetRecord extends ExerciseReference {
  id: string
  sessionId: string
  performedExerciseId: string
  setNumber: number
  completedAt: string
  measurementType?: MeasurementType | null
  weightKg: number | null
  reps: number | null
  rightWeightKg?: number | null
  rightReps?: number | null
  durationSeconds: number | null
  distanceMeters: number | null
}

export interface ExerciseProfile extends ExerciseMetadata {
  id: string
  catalogExerciseId?: string | null
  deletedAt?: string | null
  measurementType?: MeasurementType | null
  name: string
  movementPattern?: MovementPattern | null
  muscleDistribution: MuscleDistributionItem[]
  source?: 'custom'
  aliases?: string[]
  notes?: string
  copiedFromProfileId?: string | null
  importSignature?: string
  legacyOverride?: boolean
  preferencesOnly?: boolean
  updatedAt: string
}

export interface RestTimerState {
  exerciseId: string
  status: RestTimerStatus
  startedAt: string | null
  endsAt: string | null
}
