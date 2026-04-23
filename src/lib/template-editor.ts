export type TemplateExerciseDraft = {
  name: string
  targetSets: string
  restSeconds: string
  weightKg: string
  reps: string
}

export const emptyTemplateExerciseDraft: TemplateExerciseDraft = {
  name: '',
  targetSets: '3',
  restSeconds: '90',
  weightKg: '',
  reps: '',
}

export function toTemplateExerciseDraft(input?: {
  name: string
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
    targetSets: String(input.targetSets),
    restSeconds: String(input.restSeconds),
    weightKg: input.weightKg === null || input.weightKg === undefined ? '' : String(input.weightKg),
    reps: input.reps === null || input.reps === undefined ? '' : String(input.reps),
  }
}
