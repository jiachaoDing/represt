export type MeasurementType = 'weightReps' | 'reps' | 'duration' | 'distance' | 'weightDistance'

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'hips'
  | 'quadriceps'
  | 'hamstrings'
  | 'calves'
  | 'fullBody'

export type Equipment = {
  id: string
  aliases: string[]
}

export type Muscle = {
  id: string
  groupId: MuscleGroup
  aliases: string[]
}

export type Exercise = {
  id: string
  slug: string
  equipmentIds: string[]
  primaryMuscleIds: string[]
  secondaryMuscleIds: string[]
  measurementType: MeasurementType
  aliases: string[]
  sourceUrls: string[]
}

export type ExerciseCatalogReviewItem = {
  id: string
  reason: string
}
