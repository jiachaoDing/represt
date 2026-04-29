import Dexie, { type EntityTable } from 'dexie'

import type {
  SessionExercise,
  SetRecord,
  TrainingCycle,
  TemplateExercise,
  WorkoutSession,
  WorkoutTemplate,
} from '../models/types'

class TrainReDatabase extends Dexie {
  trainingCycles!: EntityTable<TrainingCycle, 'id'>
  workoutTemplates!: EntityTable<WorkoutTemplate, 'id'>
  templateExercises!: EntityTable<TemplateExercise, 'id'>
  workoutSessions!: EntityTable<WorkoutSession, 'id'>
  sessionExercises!: EntityTable<SessionExercise, 'id'>
  setRecords!: EntityTable<SetRecord, 'id'>

  constructor() {
    super('trainre')

    this.version(10)
      .stores({
        trainingCycles: 'id, updatedAt',
        workoutTemplates: 'id, name, updatedAt',
        templateExercises: 'id, templateId, [templateId+order]',
        workoutSessions: 'id, &sessionDateKey, createdAt',
        sessionExercises: 'id, sessionId, restEndsAt, [sessionId+order]',
        setRecords: 'id, sessionId, sessionExerciseId, [sessionExerciseId+setNumber], completedAt',
      })
      .upgrade(async (transaction) => {
        await Promise.all([
          transaction.table('trainingCycles').clear(),
          transaction.table('workoutTemplates').clear(),
          transaction.table('templateExercises').clear(),
          transaction.table('workoutSessions').clear(),
          transaction.table('sessionExercises').clear(),
          transaction.table('setRecords').clear(),
        ])
      })
  }
}

export const db = new TrainReDatabase()
