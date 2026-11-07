import type { ExerciseMetadata, MeasurementType, MovementPattern, MuscleDistributionItem } from '../domain/exercise-catalog'

export type PlanTransferExercise = import('../models/types').ExerciseReference & {
  name: string
  catalogExerciseId?: string | null
  measurementType?: MeasurementType | null
  targetSets: number
  restSeconds: number
  weightKg: number | null
  reps: number | null
  rightWeightKg?: number | null
  rightReps?: number | null
  durationSeconds: number | null
  distanceMeters: number | null
}

export type PlanTransferPlan = {
  planName: string
  exercises: PlanTransferExercise[]
}

export type PlanTransferExerciseModel = ExerciseMetadata & {
  profileId?: string
  measurementType?: MeasurementType | null
  aliases?: string[]
  notes?: string
  copiedFromProfileId?: string | null
  name: string
  catalogExerciseId?: string | null
  movementPattern: MovementPattern
  muscleDistribution: MuscleDistributionItem[]
}

export type PlanTransferData = {
  formatVersion?: 1 | 2
  plans: PlanTransferPlan[]
  cycle: Array<number | null>
  exerciseModels: PlanTransferExerciseModel[]
}

export type PlanTemplateExportOption = {
  id: string
  name: string
  exerciseCount: number
}

export type PlanTransferParseError = 'missingJson' | 'invalidJson' | 'invalidShape' | 'emptyExercises'

export type PlanTransferParseResult =
  | { ok: true; data: PlanTransferData }
  | { ok: false; error: PlanTransferParseError }
