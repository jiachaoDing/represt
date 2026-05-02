import { arrayMove } from '@dnd-kit/sortable'

import type { PlanExercise } from '../../models/types'

export function getOrderedExercises(
  planExercises: PlanExercise[],
  exerciseOrder: string[] | null,
) {
  if (!exerciseOrder || exerciseOrder.length !== planExercises.length) {
    return planExercises
  }

  const exerciseMap = new Map(planExercises.map((exercise) => [exercise.id, exercise]))
  const orderedExercises = exerciseOrder
    .map((exerciseId) => exerciseMap.get(exerciseId) ?? null)
    .filter((exercise): exercise is PlanExercise => exercise !== null)

  return orderedExercises.length === planExercises.length ? orderedExercises : planExercises
}

export function getReorderedExerciseIds(
  exercises: PlanExercise[],
  activeExerciseId: string,
  overExerciseId: string,
) {
  const oldIndex = exercises.findIndex((exercise) => exercise.id === activeExerciseId)
  const newIndex = exercises.findIndex((exercise) => exercise.id === overExerciseId)

  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return null
  }

  return arrayMove(exercises, oldIndex, newIndex).map((exercise) => exercise.id)
}
