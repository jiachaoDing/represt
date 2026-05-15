import type {
  PerformedExercise,
  SessionPlanItem,
  SessionStatus,
  SetRecord,
  WorkoutSession,
} from '../models/types'
import type { MeasurementType } from '../domain/exercise-catalog'
import type { DerivedExerciseStatus } from '../lib/session-display'

export type WorkoutSessionWithStatus = WorkoutSession & {
  status: SessionStatus
}

export type ScheduleExercise = SessionPlanItem & {
  completedSets: number
  lastCompletedAt: string | null
  performedExerciseId: string | null
  restEndsAt: string | null
  status: DerivedExerciseStatus
}

export type WorkoutSessionWithExercises = WorkoutSessionWithStatus & {
  exercises: ScheduleExercise[]
}

export type ScheduleExerciseDetail = {
  session: WorkoutSessionWithStatus
  exercise: ScheduleExercise
  latestSetRecord: SetRecord | null
}

export type SessionSummaryExercise = PerformedExercise & {
  status: DerivedExerciseStatus
  setRecords: SetRecord[]
}

export type SessionSummaryTimeSegment = {
  durationMinutes: number
  endedAt: string
  startedAt: string
}

export type SessionSummaryDetail = {
  activeDurationMinutes: number | null
  endedAtFromLastSet: string | null
  session: WorkoutSessionWithStatus
  startedAtFromFirstSet: string | null
  trainingTimeSegments: SessionSummaryTimeSegment[]
  exercises: SessionSummaryExercise[]
}

export type PlanSyncStatus = {
  hasUpdates: boolean
  planName: string | null
}

export type PlanSyncResult = {
  addedCount: number
  updatedCount: number
  removedCount: number
}

export type SessionPlanItemInput = {
  name: string
  catalogExerciseId?: string | null
  measurementType?: MeasurementType | null
  targetSets?: number
  restSeconds?: number
  defaultReps?: number | null
  defaultWeightKg?: number | null
  defaultDurationSeconds?: number | null
  defaultDistanceMeters?: number | null
}
