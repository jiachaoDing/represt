import { arrayMove } from '@dnd-kit/sortable'

import type { WorkoutSessionWithExercises } from '../../db/sessions'

type ScheduleExercise = WorkoutSessionWithExercises['exercises'][number]

export function getOrderedScheduleExercises(
  exercises: ScheduleExercise[],
  exerciseOrder: string[] | null,
) {
  if (!exerciseOrder || exerciseOrder.length !== exercises.length) {
    return exercises
  }

  const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const nextExercises = exerciseOrder
    .map((exerciseId) => exerciseMap.get(exerciseId) ?? null)
    .filter((exercise): exercise is ScheduleExercise => exercise !== null)

  return nextExercises.length === exercises.length ? nextExercises : exercises
}

export function getReorderedScheduleExerciseIds(
  exercises: ScheduleExercise[],
  activeExerciseId: string,
  overExerciseId: string,
) {
  if (activeExerciseId === overExerciseId) {
    return null
  }

  const oldIndex = exercises.findIndex((exercise) => exercise.id === activeExerciseId)
  const newIndex = exercises.findIndex((exercise) => exercise.id === overExerciseId)

  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return null
  }

  return arrayMove(exercises, oldIndex, newIndex).map((exercise) => exercise.id)
}
