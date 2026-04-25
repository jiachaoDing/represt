export type SessionStatus = 'pending' | 'active' | 'completed'

export type RestTimerStatus = 'idle' | 'running' | 'ready'

export interface WorkoutTemplate {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface TrainingCycleSlot {
  id: string
  templateId: string | null
}

export interface TrainingCycle {
  id: string
  slots: TrainingCycleSlot[]
  anchorDateKey: string
  anchorIndex: number
  updatedAt: string
}

export interface TemplateExercise {
  id: string
  templateId: string
  name: string
  targetSets: number
  restSeconds: number
  weightKg?: number | null
  reps?: number | null
  order: number
}

export interface WorkoutSession {
  id: string
  sessionDateKey: string
  createdAt: string
  autoImportedTemplateId?: string | null
  autoImportedAt?: string | null
  lastSyncedTemplateUpdatedAt?: string | null
  deletedTemplateExerciseIds?: string[]
}

export interface SessionTemplateExerciseSnapshot {
  name: string
  targetSets: number
  defaultWeightKg?: number | null
  defaultReps?: number | null
  restSeconds: number
  order: number
}

export interface SessionExercise {
  id: string
  sessionId: string
  templateExerciseId: string | null
  sourceTemplateId?: string | null
  sourceTemplateSnapshot?: SessionTemplateExerciseSnapshot | null
  origin?: 'template' | 'manual'
  removedFromTemplate?: boolean
  archivedAt?: string | null
  name: string
  targetSets: number
  defaultWeightKg?: number | null
  defaultReps?: number | null
  completedSets: number
  restSeconds: number
  order: number
  lastCompletedAt: string | null
  restEndsAt: string | null
}

export interface SetRecord {
  id: string
  sessionId: string
  sessionExerciseId: string
  setNumber: number
  completedAt: string
  weightKg: number | null
  reps: number | null
}

export interface RestTimerState {
  sessionExerciseId: string
  status: RestTimerStatus
  startedAt: string | null
  endsAt: string | null
}
