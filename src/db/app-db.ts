import Dexie, { type EntityTable } from 'dexie'

import { exercises, type MeasurementType } from '../domain/exercise-catalog'
import { resolveCatalogExerciseId } from '../lib/exercise-name'
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

const catalogExercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]))

function normalizeExerciseRecordName(name: string) {
  return name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
}

function getDefaultMeasurementType(catalogExerciseId: string | null): MeasurementType {
  if (!catalogExerciseId) {
    return 'weightReps'
  }

  return catalogExercisesById.get(catalogExerciseId)?.measurementType ?? 'weightReps'
}

function getMigrationProfileId(input: { catalogExerciseId?: string | null; id?: string; name?: string | null }) {
  const catalogExerciseId = resolveCatalogExerciseId(input)
  if (catalogExerciseId) {
    return `catalog:${catalogExerciseId}`
  }

  const normalizedName = normalizeExerciseRecordName(input.name ?? '')
  return normalizedName ? `name:${normalizedName}` : `exercise:${input.id ?? crypto.randomUUID()}`
}

class RepRestDatabase extends Dexie {
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

    this.version(18)
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
      .upgrade(async (tx) => {
        const [exerciseProfiles, planExercises, sessionPlanItems, performedExercises] = await Promise.all([
          tx.table('exerciseProfiles').toArray(),
          tx.table('planExercises').toArray(),
          tx.table('sessionPlanItems').toArray(),
          tx.table('performedExercises').toArray(),
        ])

        const measurementTypeByProfileId = new Map<string, MeasurementType>()

        for (const profile of exerciseProfiles) {
          const catalogExerciseId = resolveCatalogExerciseId({
            catalogExerciseId: profile.catalogExerciseId ?? null,
            name: profile.name,
          })
          const measurementType = profile.measurementType ?? getDefaultMeasurementType(catalogExerciseId)
          measurementTypeByProfileId.set(profile.id, measurementType)
          profile.measurementType = measurementType
        }

        for (const exercise of planExercises) {
          const profileId = getMigrationProfileId(exercise)
          exercise.measurementType =
            exercise.measurementType
            ?? measurementTypeByProfileId.get(profileId)
            ?? getDefaultMeasurementType(resolveCatalogExerciseId(exercise))
        }

        for (const item of sessionPlanItems) {
          const profileId = getMigrationProfileId(item)
          item.measurementType =
            item.measurementType
            ?? measurementTypeByProfileId.get(profileId)
            ?? getDefaultMeasurementType(resolveCatalogExerciseId(item))
        }

        for (const exercise of performedExercises) {
          const profileId = getMigrationProfileId(exercise)
          exercise.measurementType =
            exercise.measurementType
            ?? measurementTypeByProfileId.get(profileId)
            ?? getDefaultMeasurementType(resolveCatalogExerciseId(exercise))
        }

        await Promise.all([
          tx.table('exerciseProfiles').bulkPut(exerciseProfiles),
          tx.table('planExercises').bulkPut(planExercises),
          tx.table('sessionPlanItems').bulkPut(sessionPlanItems),
          tx.table('performedExercises').bulkPut(performedExercises),
        ])
      })
  }
}

export const db = new RepRestDatabase()
