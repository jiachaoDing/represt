import type { MuscleGroup } from './types'

export const loadModes = ['external', 'bodyweight', 'assisted', 'variable'] as const
export type LoadMode = (typeof loadModes)[number]
export type TrainingDefaults = {
  targetSets?: number
  restSeconds?: number
  repsRange?: { min: number; max: number } | null
  weightIncrementKg?: number | null
}
export type ExerciseGuide = {
  description?: string
  instructions?: string[]
  cues?: string[]
  commonMistakes?: string[]
}
export type ExerciseProvenance = {
  source: string
  sourceId: string
  version: string
  license: string
  author: string
  url: string
  modified?: boolean
}
export type ExerciseMetadata = {
  muscles?: Array<{ id: string; role: 'primary' | 'secondary' }>
  primaryEquipment?: string | null
  setup?: string[]
  mechanic?: 'compound' | 'isolation' | null
  laterality?: 'bilateral' | 'unilateral' | 'alternating' | null
  loadMode?: LoadMode
  trainingDefaults?: TrainingDefaults
  provenance?: ExerciseProvenance[]
}
export type MuscleNode = { id: string; parentId: string | null; group: MuscleGroup | 'other'; name: string }

export function getTrainingDefaults(metadata: ExerciseMetadata): TrainingDefaults {
  const numericLoad = metadata.loadMode !== 'assisted' && metadata.loadMode !== 'variable'
  return {
    targetSets: 4,
    restSeconds: 90,
    repsRange: metadata.mechanic ? { min: metadata.mechanic === 'compound' ? 6 : 10, max: metadata.mechanic === 'compound' ? 12 : 15 } : null,
    weightIncrementKg: numericLoad ? metadata.primaryEquipment === 'barbell' ? 2.5 : metadata.primaryEquipment === 'dumbbell' ? 1 : null : null,
    ...metadata.trainingDefaults,
  }
}
