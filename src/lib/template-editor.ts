export type TemplateExerciseDraft = {
  name: string
  catalogExerciseId: string | null
  targetSets: string
  restSeconds: string
  weightKg: string
  reps: string
}

export const emptyTemplateExerciseDraft: TemplateExerciseDraft = {
  name: '',
  catalogExerciseId: null,
  targetSets: '3',
  restSeconds: '90',
  weightKg: '',
  reps: '',
}

export function toTemplateExerciseDraft(input?: {
  name: string
  catalogExerciseId?: string | null
  targetSets: number
  restSeconds: number
  weightKg?: number | null
  reps?: number | null
}): TemplateExerciseDraft {
  if (!input) {
    return emptyTemplateExerciseDraft
  }

  return {
    name: input.name,
    catalogExerciseId: input.catalogExerciseId ?? null,
    targetSets: String(input.targetSets),
    restSeconds: String(input.restSeconds),
    weightKg: input.weightKg === null || input.weightKg === undefined ? '' : String(input.weightKg),
    reps: input.reps === null || input.reps === undefined ? '' : String(input.reps),
  }
}
