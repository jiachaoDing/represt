export type SessionStatus = 'pending' | 'active' | 'completed'

export type SessionExerciseStatus = 'pending' | 'active' | 'completed'

export type RestTimerStatus = 'idle' | 'running' | 'ready'

export interface WorkoutTemplate {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface TemplateExercise {
  id: string
  templateId: string
  name: string
  targetSets: number
  restSeconds: number
  order: number
}

export interface WorkoutSession {
  id: string
  templateId: string | null
  templateName: string | null
  status: SessionStatus
  startedAt: string | null
  endedAt: string | null
  createdAt: string
}

export interface SessionExercise {
  id: string
  sessionId: string
  templateExerciseId: string | null
  name: string
  targetSets: number
  completedSets: number
  restSeconds: number
  order: number
  lastCompletedAt: string | null
  restEndsAt: string | null
  status: SessionExerciseStatus
}

export interface SetRecord {
  id: string
  sessionId: string
  sessionExerciseId: string
  setNumber: number
  completedAt: string
  durationSeconds: number
  weightKg: number | null
  reps: number | null
}

export interface RestTimerState {
  sessionExerciseId: string
  status: RestTimerStatus
  startedAt: string | null
  endsAt: string | null
}
