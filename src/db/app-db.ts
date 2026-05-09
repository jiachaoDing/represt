import Dexie, { type EntityTable } from 'dexie'

import type {
  ExerciseProfile,
  PerformedExercise,
  PlanExercise,
  SessionPlanItem,
  SetRecord,
  TrainingCycle,
  WorkoutPlan,
  WorkoutSession,
} from '../models/types'

export type SharedPlanRecord = {
  code: string
  url: string
  title: string
  createdAt: string
  expiresAt: string | null
}

class TrainReDatabase extends Dexie {
  trainingCycles!: EntityTable<TrainingCycle, 'id'>
  workoutPlans!: EntityTable<WorkoutPlan, 'id'>
  planExercises!: EntityTable<PlanExercise, 'id'>
  workoutSessions!: EntityTable<WorkoutSession, 'id'>
  sessionPlanItems!: EntityTable<SessionPlanItem, 'id'>
  performedExercises!: EntityTable<PerformedExercise, 'id'>
  setRecords!: EntityTable<SetRecord, 'id'>
  exerciseProfiles!: EntityTable<ExerciseProfile, 'id'>
  sharedPlanRecords!: EntityTable<SharedPlanRecord, 'code'>

  constructor() {
    super('trainre')

    this.version(16)
      .stores({
        trainingCycles: 'id, updatedAt',
        workoutPlans: 'id, name, updatedAt',
        planExercises: 'id, planId, [planId+order]',
        workoutSessions: 'id, &sessionDateKey, createdAt',
        sessionPlanItems: 'id, sessionId, planExerciseId, sourcePlanId, [sessionId+order]',
        performedExercises: 'id, sessionId, planItemId, restEndsAt, [sessionId+order]',
        setRecords: 'id, sessionId, performedExerciseId, [performedExerciseId+setNumber], completedAt',
        exerciseProfiles: 'id, catalogExerciseId, name, updatedAt',
      })

    this.version(17)
      .stores({
        trainingCycles: 'id, updatedAt',
        workoutPlans: 'id, name, updatedAt',
        planExercises: 'id, planId, [planId+order]',
        workoutSessions: 'id, &sessionDateKey, createdAt',
        sessionPlanItems: 'id, sessionId, planExerciseId, sourcePlanId, [sessionId+order]',
        performedExercises: 'id, sessionId, planItemId, restEndsAt, [sessionId+order]',
        setRecords: 'id, sessionId, performedExerciseId, [performedExerciseId+setNumber], completedAt',
        exerciseProfiles: 'id, catalogExerciseId, name, updatedAt',
        sharedPlanRecords: 'code, createdAt, expiresAt',
      })
  }
}

export const db = new TrainReDatabase()
