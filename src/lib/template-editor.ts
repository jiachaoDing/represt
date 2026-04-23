export type TemplateExerciseDraft = {
  name: string
  targetSets: string
  restSeconds: string
}

export const emptyTemplateExerciseDraft: TemplateExerciseDraft = {
  name: '',
  targetSets: '3',
  restSeconds: '90',
}

export function toTemplateExerciseDraft(input?: {
  name: string
  targetSets: number
  restSeconds: number
}): TemplateExerciseDraft {
  if (!input) {
    return emptyTemplateExerciseDraft
  }

  return {
    name: input.name,
    targetSets: String(input.targetSets),
    restSeconds: String(input.restSeconds),
  }
}
