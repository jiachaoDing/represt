import Dexie, { type EntityTable } from 'dexie'

import type {
  SessionExercise,
  SetRecord,
  TemplateExercise,
  WorkoutSession,
  WorkoutTemplate,
} from '../models/types'

class TrainReDatabase extends Dexie {
  workoutTemplates!: EntityTable<WorkoutTemplate, 'id'>
  templateExercises!: EntityTable<TemplateExercise, 'id'>
  workoutSessions!: EntityTable<WorkoutSession, 'id'>
  sessionExercises!: EntityTable<SessionExercise, 'id'>
  setRecords!: EntityTable<SetRecord, 'id'>

  constructor() {
    super('trainre')

    this.version(7)
      .stores({
        workoutTemplates: 'id, name, updatedAt',
        templateExercises: 'id, templateId, [templateId+order]',
        workoutSessions: 'id, &sessionDateKey, createdAt',
        sessionExercises: 'id, sessionId, restEndsAt, [sessionId+order]',
        setRecords: 'id, sessionId, sessionExerciseId, [sessionExerciseId+setNumber], completedAt',
      })
  }
}

export const db = new TrainReDatabase()
