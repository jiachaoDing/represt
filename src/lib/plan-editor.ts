export type PlanExerciseDraft = {
  name: string
  catalogExerciseId: string | null
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
  targetSets: '3',
  restSeconds: '90',
  weightKg: '',
  reps: '',
  durationSeconds: '',
  distanceMeters: '',
}

export function toPlanExerciseDraft(input?: {
  name: string
  catalogExerciseId?: string | null
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
