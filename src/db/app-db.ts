import Dexie, { type EntityTable } from 'dexie'

import type {
  PerformedExercise,
  SessionPlanItem,
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
  sessionPlanItems!: EntityTable<SessionPlanItem, 'id'>
  performedExercises!: EntityTable<PerformedExercise, 'id'>
  setRecords!: EntityTable<SetRecord, 'id'>

  constructor() {
    super('trainre')

    this.version(11)
      .stores({
        trainingCycles: 'id, updatedAt',
        workoutTemplates: 'id, name, updatedAt',
        templateExercises: 'id, templateId, [templateId+order]',
        workoutSessions: 'id, &sessionDateKey, createdAt',
        sessionPlanItems: 'id, sessionId, templateExerciseId, sourceTemplateId, [sessionId+order]',
        performedExercises: 'id, sessionId, planItemId, restEndsAt, [sessionId+order]',
        setRecords: 'id, sessionId, performedExerciseId, [performedExerciseId+setNumber], completedAt',
      })

    this.version(12)
      .stores({
        trainingCycles: 'id, updatedAt',
        workoutTemplates: 'id, name, updatedAt',
        templateExercises: 'id, templateId, [templateId+order]',
        workoutSessions: 'id, &sessionDateKey, createdAt',
        sessionPlanItems: 'id, sessionId, templateExerciseId, sourceTemplateId, [sessionId+order]',
        performedExercises: 'id, sessionId, planItemId, restEndsAt, [sessionId+order]',
        setRecords: 'id, sessionId, performedExerciseId, [performedExerciseId+setNumber], completedAt',
      })
      .upgrade((transaction) =>
        transaction.table('setRecords').toCollection().modify((setRecord) => {
          setRecord.durationSeconds ??= null
          setRecord.distanceMeters ??= null
        }),
      )

    this.version(13)
      .stores({
        trainingCycles: 'id, updatedAt',
        workoutTemplates: 'id, name, updatedAt',
        templateExercises: 'id, templateId, [templateId+order]',
        workoutSessions: 'id, &sessionDateKey, createdAt',
        sessionPlanItems: 'id, sessionId, templateExerciseId, sourceTemplateId, [sessionId+order]',
        performedExercises: 'id, sessionId, planItemId, restEndsAt, [sessionId+order]',
        setRecords: 'id, sessionId, performedExerciseId, [performedExerciseId+setNumber], completedAt',
      })
      .upgrade(async (transaction) => {
        await transaction.table('templateExercises').toCollection().modify((exercise) => {
          exercise.durationSeconds ??= null
          exercise.distanceMeters ??= null
        })
        await transaction.table('sessionPlanItems').toCollection().modify((item) => {
          item.defaultDurationSeconds ??= null
          item.defaultDistanceMeters ??= null
        })
        await transaction.table('performedExercises').toCollection().modify((exercise) => {
          exercise.defaultDurationSeconds ??= null
          exercise.defaultDistanceMeters ??= null
        })
      })
  }
}

export const db = new TrainReDatabase()
