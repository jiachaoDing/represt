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
          .modify((exercise: SessionExercise & { status?: string }) => {
            if (exercise.restEndsAt !== undefined) {
              return
            }

            exercise.restEndsAt =
              exercise.status === 'completed' || exercise.completedSets >= exercise.targetSets || !exercise.lastCompletedAt
                ? null
                : getRestEndsAt(exercise.lastCompletedAt, exercise.restSeconds)
          })
      })

    this.version(3).stores({
      workoutTemplates: 'id, name, updatedAt, deletedAt',
      templateExercises: 'id, templateId, [templateId+order]',
      workoutSessions: 'id, &sessionDateKey, status, createdAt',
      sessionExercises: 'id, sessionId, status, restEndsAt, [sessionId+order]',
      setRecords: 'id, sessionId, sessionExerciseId, [sessionExerciseId+setNumber], completedAt',
    })

    this.version(4)
      .stores({
        workoutTemplates: 'id, name, updatedAt, deletedAt',
        templateExercises: 'id, templateId, [templateId+order]',
        workoutSessions: 'id, &sessionDateKey, createdAt',
        sessionExercises: 'id, sessionId, status, restEndsAt, [sessionId+order]',
        setRecords: 'id, sessionId, sessionExerciseId, [sessionExerciseId+setNumber], completedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('workoutSessions')
          .toCollection()
          .modify((session: WorkoutSession & { status?: string }) => {
            delete session.status
          })
      })

    this.version(5)
      .stores({
        workoutTemplates: 'id, name, updatedAt, deletedAt',
        templateExercises: 'id, templateId, [templateId+order]',
        workoutSessions: 'id, &sessionDateKey, createdAt',
        sessionExercises: 'id, sessionId, status, restEndsAt, [sessionId+order]',
        setRecords: 'id, sessionId, sessionExerciseId, [sessionExerciseId+setNumber], completedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('workoutSessions')
          .toCollection()
          .modify((session: WorkoutSession & { startedAt?: string | null; endedAt?: string | null }) => {
            delete session.startedAt
            delete session.endedAt
          })

        await tx
          .table('setRecords')
          .toCollection()
          .modify((setRecord: SetRecord & { durationSeconds?: number }) => {
            delete setRecord.durationSeconds
          })
      })

    this.version(6)
      .stores({
        workoutTemplates: 'id, name, updatedAt',
        templateExercises: 'id, templateId, [templateId+order]',
        workoutSessions: 'id, &sessionDateKey, createdAt',
        sessionExercises: 'id, sessionId, restEndsAt, [sessionId+order]',
        setRecords: 'id, sessionId, sessionExerciseId, [sessionExerciseId+setNumber], completedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('sessionExercises')
          .toCollection()
          .modify((exercise: SessionExercise & { status?: string }) => {
            delete exercise.status
          })
      })

    this.version(7)
      .stores({
        workoutTemplates: 'id, name, updatedAt',
        templateExercises: 'id, templateId, [templateId+order]',
        workoutSessions: 'id, &sessionDateKey, createdAt',
        sessionExercises: 'id, sessionId, restEndsAt, [sessionId+order]',
        setRecords: 'id, sessionId, sessionExerciseId, [sessionExerciseId+setNumber], completedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('workoutTemplates')
          .toCollection()
          .modify((template: WorkoutTemplate & { deletedAt?: string | null }) => {
            delete template.deletedAt
          })
      })
  }
}

export const db = new TrainReDatabase()
