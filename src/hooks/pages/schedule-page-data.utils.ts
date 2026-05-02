import {
  parseIntegerInput,
  parseOptionalDistanceMeters,
  parseOptionalDurationSeconds,
  parseOptionalReps,
  parseOptionalWeightKg,
} from '../../lib/input-parsers'
import type { PlanExerciseDraft } from '../../lib/plan-editor'
import type { WorkoutSessionWithExercises } from '../../db/sessions'
import type { PlanWithExercises } from '../../db/plans'

export const emptyExerciseDraft: PlanExerciseDraft = {
  name: '',
  catalogExerciseId: null,
  targetSets: '3',
  restSeconds: '90',
  weightKg: '',
  reps: '',
  durationSeconds: '',
  distanceMeters: '',
}

export function hasImportedPlanExercises(
  session: WorkoutSessionWithExercises,
  plan: PlanWithExercises,
  planExerciseIds?: string[],
) {
  const selectedPlanExerciseIds = planExerciseIds ? new Set(planExerciseIds) : null
  const selectedExercises = plan.exercises.filter((exercise) =>
    selectedPlanExerciseIds ? selectedPlanExerciseIds.has(exercise.id) : true,
  )

  if (selectedExercises.length === 0) {
    return false
  }

  const importedPlanExerciseIds = new Set(
    session.exercises
      .map((exercise) => exercise.planExerciseId)
      .filter((planExerciseId) => planExerciseId !== null),
  )

  return selectedExercises.every((exercise) => importedPlanExerciseIds.has(exercise.id))
}

export function draftToSessionPlanInput(draft: PlanExerciseDraft) {
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
