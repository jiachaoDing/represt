export type MeasurementType = 'weightReps' | 'reps' | 'duration' | 'distance' | 'weightDistance'

export type MovementPattern = 'push' | 'pull' | 'legs' | 'core' | 'fullBody' | 'conditioning'

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'legs'
  | 'fullBody'

export type Equipment = {
  id: string
}

export type Muscle = {
  id: string
  groupId: MuscleGroup
}

export type Exercise = {
  id: string
  slug: string
  equipmentIds: string[]
  primaryMuscleIds: string[]
  secondaryMuscleIds: string[]
  movementPattern: MovementPattern
  measurementType: MeasurementType
  sourceUrls: string[]
}

export type ExerciseCatalogReviewItem = {
  id: string
  reason: string
}
