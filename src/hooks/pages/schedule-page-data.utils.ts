import {
  parseIntegerInput,
  parseOptionalDistanceMeters,
  parseOptionalDurationSeconds,
  parseOptionalReps,
  parseOptionalWeightKg,
} from '../../lib/input-parsers'
import type { TemplateExerciseDraft } from '../../lib/template-editor'
import type { WorkoutSessionWithExercises } from '../../db/sessions'
import type { TemplateWithExercises } from '../../db/templates'

export const emptyExerciseDraft: TemplateExerciseDraft = {
  name: '',
  catalogExerciseId: null,
  targetSets: '3',
  restSeconds: '90',
  weightKg: '',
  reps: '',
  durationSeconds: '',
  distanceMeters: '',
}

export function hasImportedTemplateExercises(
  session: WorkoutSessionWithExercises,
  template: TemplateWithExercises,
  templateExerciseIds?: string[],
) {
  const selectedTemplateExerciseIds = templateExerciseIds ? new Set(templateExerciseIds) : null
  const selectedExercises = template.exercises.filter((exercise) =>
    selectedTemplateExerciseIds ? selectedTemplateExerciseIds.has(exercise.id) : true,
  )

  if (selectedExercises.length === 0) {
    return false
  }

  const importedTemplateExerciseIds = new Set(
    session.exercises
      .map((exercise) => exercise.templateExerciseId)
      .filter((templateExerciseId) => templateExerciseId !== null),
  )

  return selectedExercises.every((exercise) => importedTemplateExerciseIds.has(exercise.id))
}

export function draftToSessionPlanInput(draft: TemplateExerciseDraft) {
  return {
    name: draft.name,
    catalogExerciseId: draft.catalogExerciseId,
    targetSets: parseIntegerInput(draft.targetSets),
    restSeconds: parseIntegerInput(draft.restSeconds),
    defaultWeightKg: parseOptionalWeightKg(draft.weightKg),
    defaultReps: parseOptionalReps(draft.reps),
    defaultDurationSeconds: parseOptionalDurationSeconds(draft.durationSeconds),
    defaultDistanceMeters: parseOptionalDistanceMeters(draft.distanceMeters),
  }
}
