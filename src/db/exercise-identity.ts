import { legacyMeasurement, legacyProfileId } from '../domain/exercise-catalog/legacy'
import type { ExerciseProfile, PerformedExercise, PlanExercise, SessionPlanItem, SetRecord } from '../models/types'

export type ExerciseTables = {
  exerciseProfiles: ExerciseProfile[]
  planExercises: PlanExercise[]
  sessionPlanItems: SessionPlanItem[]
  performedExercises: PerformedExercise[]
  setRecords: SetRecord[]
}

// Shared by Dexie upgrades and backup restoration. Names and actual set values are untouched.
export function normalizeExerciseTables<T extends ExerciseTables>(input: T): T {
  const tables = structuredClone(input)
  const profiles = new Map(tables.exerciseProfiles.map((profile) => [profile.id, profile]))
  for (const profile of profiles.values()) {
    if (profile.id.startsWith('catalog:') && !profile.preferencesOnly && profile.legacyOverride === undefined) profile.legacyOverride = true
  }
  const active = new Set([...tables.planExercises, ...tables.sessionPlanItems].map((row) => row.exerciseProfileId ?? legacyProfileId(row)))
  for (const row of [...tables.planExercises, ...tables.sessionPlanItems, ...tables.performedExercises]) {
    row.exerciseProfileId ??= legacyProfileId(row)
    if ('sourcePlanSnapshot' in row && row.sourcePlanSnapshot) {
      row.sourcePlanSnapshot.exerciseProfileId ??= legacyProfileId(row.sourcePlanSnapshot)
    }
    if (row.exerciseProfileId.startsWith('catalog:') || profiles.has(row.exerciseProfileId)) continue
    const profile: ExerciseProfile = {
      id: row.exerciseProfileId, name: row.name, catalogExerciseId: null, source: 'custom',
      measurementType: legacyMeasurement(row), loadMode: row.loadMode ?? undefined,
      movementPattern: 'unspecified', muscleDistribution: [],
      updatedAt: '1970-01-01T00:00:00.000Z',
      ...(active.has(row.exerciseProfileId) ? {} : { deletedAt: '1970-01-01T00:00:00.000Z' }),
    }
    profiles.set(profile.id, profile)
  }
  const performed = new Map(tables.performedExercises.map((row) => [row.id, row]))
  for (const record of tables.setRecords) {
    const parent = performed.get(record.performedExerciseId)
    if (parent) {
      record.exerciseProfileId ??= parent.exerciseProfileId
      record.measurementType ??= legacyMeasurement(parent)
    }
  }
  tables.exerciseProfiles = [...profiles.values()]
  return tables
}
