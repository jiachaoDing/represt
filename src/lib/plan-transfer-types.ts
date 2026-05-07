import type { MovementPattern, MuscleDistributionItem } from '../domain/exercise-catalog'

export type PlanTransferExercise = {
  name: string
  catalogExerciseId?: string | null
  targetSets: number
  restSeconds: number
  weightKg: number | null
  reps: number | null
  durationSeconds: number | null
  distanceMeters: number | null
}

export type PlanTransferPlan = {
  planName: string
  exercises: PlanTransferExercise[]
}

export type PlanTransferExerciseModel = {
  name: string
  catalogExerciseId?: string | null
  movementPattern: MovementPattern
  muscleDistribution: MuscleDistributionItem[]
}

export type PlanTransferData = {
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
