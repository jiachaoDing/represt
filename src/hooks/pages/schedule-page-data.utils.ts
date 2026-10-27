import {
  parseIntegerInput,
  parseOptionalDistanceMeters,
  parseOptionalDurationSeconds,
  parseOptionalReps,
  parseOptionalWeightKg,
} from '../../lib/input-parsers'
import type { PlanExerciseDraft } from '../../lib/plan-editor'

export function draftToSessionPlanInput(draft: PlanExerciseDraft) {
  return {
    name: draft.name,
    catalogExerciseId: draft.catalogExerciseId,
    measurementType: draft.measurementType,
    targetSets: parseIntegerInput(draft.targetSets),
    restSeconds: parseIntegerInput(draft.restSeconds),
    defaultWeightKg: parseOptionalWeightKg(draft.weightKg),
    defaultReps: parseOptionalReps(draft.reps),
    defaultRightWeightKg: parseOptionalWeightKg(draft.rightWeightKg),
    defaultRightReps: parseOptionalReps(draft.rightReps),
    defaultDurationSeconds: parseOptionalDurationSeconds(draft.durationSeconds),
    defaultDistanceMeters: parseOptionalDistanceMeters(draft.distanceMeters),
  }
}
