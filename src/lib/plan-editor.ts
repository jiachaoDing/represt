import type { MeasurementType } from '../domain/exercise-catalog'
import { kgToDisplayWeightString } from './weight-units'

export type PlanExerciseDraft = {
  name: string
  catalogExerciseId: string | null
  measurementType: MeasurementType | null
  targetSets: string
  restSeconds: string
  weightKg: string
  reps: string
  rightWeightKg: string
  rightReps: string
  durationSeconds: string
  distanceMeters: string
}

export const emptyPlanExerciseDraft: PlanExerciseDraft = {
  name: '',
  catalogExerciseId: null,
  measurementType: null,
  targetSets: '4',
  restSeconds: '90',
  weightKg: '',
  reps: '',
  rightWeightKg: '',
  rightReps: '',
  durationSeconds: '',
  distanceMeters: '',
}

export function toPlanExerciseDraft(input?: {
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
}): PlanExerciseDraft {
  if (!input) {
    return emptyPlanExerciseDraft
  }

  return {
    name: input.name,
    catalogExerciseId: input.catalogExerciseId ?? null,
    measurementType: input.measurementType ?? null,
    targetSets: String(input.targetSets),
    restSeconds: String(input.restSeconds),
    weightKg: kgToDisplayWeightString(input.weightKg),
    reps: input.reps === null || input.reps === undefined ? '' : String(input.reps),
    rightWeightKg: kgToDisplayWeightString(input.rightWeightKg),
    rightReps: input.rightReps == null ? '' : String(input.rightReps),
    durationSeconds:
      input.durationSeconds === null || input.durationSeconds === undefined ? '' : String(input.durationSeconds),
    distanceMeters:
      input.distanceMeters === null || input.distanceMeters === undefined ? '' : String(input.distanceMeters),
  }
}
