import { arrayMove } from '@dnd-kit/sortable'

import type { TemplateExercise } from '../../models/types'

export function getOrderedExercises(
  templateExercises: TemplateExercise[],
  exerciseOrder: string[] | null,
) {
  if (!exerciseOrder || exerciseOrder.length !== templateExercises.length) {
    return templateExercises
  }

  const exerciseMap = new Map(templateExercises.map((exercise) => [exercise.id, exercise]))
  const orderedExercises = exerciseOrder
    .map((exerciseId) => exerciseMap.get(exerciseId) ?? null)
    .filter((exercise): exercise is TemplateExercise => exercise !== null)

  return orderedExercises.length === templateExercises.length ? orderedExercises : templateExercises
}

export function getReorderedExerciseIds(
  exercises: TemplateExercise[],
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
