import type { MeasurementType } from '../domain/exercise-catalog'

export type PlanExerciseDraft = {
  name: string
  catalogExerciseId: string | null
  measurementType: MeasurementType | null
  targetSets: string
  restSeconds: string
  weightKg: string
  reps: string
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
    weightKg: input.weightKg === null || input.weightKg === undefined ? '' : String(input.weightKg),
    reps: input.reps === null || input.reps === undefined ? '' : String(input.reps),
    durationSeconds:
      input.durationSeconds === null || input.durationSeconds === undefined ? '' : String(input.durationSeconds),
    distanceMeters:
      input.distanceMeters === null || input.distanceMeters === undefined ? '' : String(input.distanceMeters),
  }
}
