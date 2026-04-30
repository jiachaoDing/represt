import type { measurementTypes } from './measurement-types'
import type { movementPatterns } from './movement-patterns'
import type { muscleGroups } from './muscles'

export type MeasurementType = (typeof measurementTypes)[number]

export type MovementPattern = (typeof movementPatterns)[number]

export type MuscleGroup = (typeof muscleGroups)[number]

export type Exercise = {
  id: string
  slug: string
  primaryMuscleGroupIds: MuscleGroup[]
  secondaryMuscleGroupIds: MuscleGroup[]
  movementPattern: MovementPattern
  measurementType: MeasurementType
  sourceUrls: string[]
}

export type ExerciseCatalogReviewItem = {
  id: string
  reason: string
}
