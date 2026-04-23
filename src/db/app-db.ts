import Dexie, { type EntityTable } from 'dexie'

import type {
  SessionExercise,
  SetRecord,
  TemplateExercise,
  WorkoutSession,
  WorkoutTemplate,
} from '../models/types'
import { getRestEndsAt } from '../lib/rest-timer'

class TrainReDatabase extends Dexie {
  workoutTemplates!: EntityTable<WorkoutTemplate, 'id'>
  templateExercises!: EntityTable<TemplateExercise, 'id'>
  workoutSessions!: EntityTable<WorkoutSession, 'id'>
  sessionExercises!: EntityTable<SessionExercise, 'id'>
  setRecords!: EntityTable<SetRecord, 'id'>

  constructor() {
    super('trainre')

    this.version(1).stores({
      workoutTemplates: 'id, name, updatedAt, deletedAt',
      templateExercises: 'id, templateId, [templateId+order]',
      workoutSessions: 'id, templateId, status, createdAt',
      sessionExercises: 'id, sessionId, status, [sessionId+order]',
      setRecords: 'id, sessionId, sessionExerciseId, [sessionExerciseId+setNumber], completedAt',
    })

    this.version(2)
      .stores({
        workoutTemplates: 'id, name, updatedAt, deletedAt',
        templateExercises: 'id, templateId, [templateId+order]',
        workoutSessions: 'id, templateId, status, createdAt',
        sessionExercises: 'id, sessionId, status, restEndsAt, [sessionId+order]',
        setRecords: 'id, sessionId, sessionExerciseId, [sessionExerciseId+setNumber], completedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('sessionExercises')
          .toCollection()
          .modify((exercise: SessionExercise) => {
            if (exercise.restEndsAt !== undefined) {
              return
            }

            exercise.restEndsAt =
              exercise.status === 'completed' || !exercise.lastCompletedAt
                ? null
                : getRestEndsAt(exercise.lastCompletedAt, exercise.restSeconds)
          })
      })
  }
}

export const db = new TrainReDatabase()
