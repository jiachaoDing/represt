import { exercises, getTrainingDefaults, type ExerciseMetadata, type MeasurementType, type MovementPattern, type MuscleGroup } from '../domain/exercise-catalog'
import type { ExerciseProfile } from '../models/types'
import { resolveCatalogExerciseId } from '../lib/exercise-name'
import { normalizeExerciseName } from '../domain/exercise-catalog/legacy'
import { db } from './app-db'
import { parseExerciseMetadata } from '../domain/exercise-catalog/validation'

export type ExerciseDefinition = ExerciseMetadata & {
  profileId: string
  catalogExerciseId: string | null
  name: string
  aliases: string[]
  notes: string
  muscleDistribution: ExerciseProfile['muscleDistribution']
  movementPattern: MovementPattern
  measurementType: MeasurementType
  categoryId: MuscleGroup | 'other'
  readOnly: boolean
  hidden: boolean
  legacyOverride: boolean
  copiedFromProfileId?: string | null
}

export async function listExerciseDefinitions(includeHidden = false): Promise<ExerciseDefinition[]> {
  const profiles = await db.exerciseProfiles.toArray()
  const byId = new Map(profiles.map((profile) => [profile.id, profile]))
  const builtins = exercises.map((exercise) => {
    const profileId = `catalog:${exercise.id}`
    const profile = byId.get(profileId)
    const override = profile && !profile.preferencesOnly ? profile : undefined
    const muscleDistribution = override?.muscleDistribution ?? exercise.muscleDistribution
    return {
      ...exercise, ...override, profileId, catalogExerciseId: exercise.id,
      name: override?.name ?? '', aliases: override?.aliases ?? [], notes: override?.notes ?? '',
      muscleDistribution, movementPattern: override?.movementPattern ?? exercise.movementPattern,
      measurementType: override?.measurementType ?? exercise.measurementType,
      categoryId: [...muscleDistribution].sort((a, b) => b.ratio - a.ratio)[0]?.muscleGroupId ?? 'other',
      readOnly: true, hidden: Boolean(profile?.deletedAt), legacyOverride: Boolean(override),
    } satisfies ExerciseDefinition
  })
  const custom = profiles.filter((profile) => profile.source === 'custom' && !profile.id.startsWith('catalog:')).map((profile) => ({
    ...profile, profileId: profile.id, catalogExerciseId: null, aliases: profile.aliases ?? [], notes: profile.notes ?? '',
    movementPattern: profile.movementPattern ?? 'unspecified', measurementType: profile.measurementType ?? 'weightReps',
    categoryId: [...profile.muscleDistribution].sort((a, b) => b.ratio - a.ratio)[0]?.muscleGroupId ?? 'other',
    readOnly: false, hidden: Boolean(profile.deletedAt), legacyOverride: false,
  } satisfies ExerciseDefinition))
  return [...builtins, ...custom].filter((definition) => includeHidden || !definition.hidden)
}

export async function getExerciseDefinition(profileId: string) {
  return (await listExerciseDefinitions(true)).find((definition) => definition.profileId === profileId) ?? null
}

export async function prepareExerciseReference(input: {
  exerciseProfileId?: string | null; catalogExerciseId?: string | null; name: string;
  loadMode?: ExerciseProfile['loadMode'] | null; measurementType?: MeasurementType | null;
}) {
  let profileId = input.exerciseProfileId
  if (!profileId) {
    const catalogId = resolveCatalogExerciseId(input)
    if (catalogId) profileId = `catalog:${catalogId}`
    else {
      const sameName = (await db.exerciseProfiles.toArray()).filter((profile) => profile.source === 'custom' && !profile.deletedAt && normalizeExerciseName(profile.name) === normalizeExerciseName(input.name))
      profileId = sameName.length === 1 ? sameName[0].id : `custom:${crypto.randomUUID()}`
    }
  }
  const definition = await getExerciseDefinition(profileId)
  if (!definition && !profileId.startsWith('catalog:')) {
    await db.exerciseProfiles.put({ id: profileId, source: 'custom', name: input.name, muscleDistribution: [], movementPattern: 'unspecified',
      measurementType: input.measurementType ?? 'weightReps', loadMode: input.loadMode ?? 'external', updatedAt: new Date().toISOString() })
  }
  return {
    exerciseProfileId: profileId,
    catalogExerciseId: profileId.startsWith('catalog:') ? profileId.slice(8) : null,
    measurementType: input.measurementType ?? definition?.measurementType ?? 'weightReps' as MeasurementType,
    loadMode: input.loadMode ?? definition?.loadMode ?? 'external',
    defaults: getTrainingDefaults(definition ?? {}),
  }
}

export async function setExerciseHidden(profileId: string, hidden: boolean) {
  const current = await db.exerciseProfiles.get(profileId)
  const definition = await getExerciseDefinition(profileId)
  if (!definition) return
  const now = new Date().toISOString()
  await db.exerciseProfiles.put({ ...(current ?? { id: profileId, catalogExerciseId: definition.catalogExerciseId,
    name: '', muscleDistribution: [], preferencesOnly: true }), deletedAt: hidden ? now : null, updatedAt: now })
}

export async function resetLegacyExerciseOverride(profileId: string) {
  const current = await db.exerciseProfiles.get(profileId)
  if (!current || !profileId.startsWith('catalog:')) return
  await db.exerciseProfiles.put({ id: profileId, catalogExerciseId: profileId.slice(8), name: '', muscleDistribution: [],
    preferencesOnly: true, deletedAt: current.deletedAt, updatedAt: new Date().toISOString() })
}

export async function copyExerciseDefinition(profileId: string, name: string) {
  const definition = await getExerciseDefinition(profileId)
  if (!definition) return null
  const id = `custom:${crypto.randomUUID()}`
  const guides = await import('../domain/exercise-catalog/guides-en.json')
  const guide = (guides.default as Record<string, { description?: string; instructions?: string[]; cues?: string[]; commonMistakes?: string[] }>)[definition.catalogExerciseId ?? '']
  const notes = definition.notes || [guide?.description, ...guide?.instructions ?? [], ...guide?.cues ?? [], ...guide?.commonMistakes ?? []].filter(Boolean).join('\n\n')
  await db.exerciseProfiles.put({ ...parseExerciseMetadata(definition), id, catalogExerciseId: null, name, source: 'custom',
    measurementType: definition.measurementType, movementPattern: definition.movementPattern,
    muscleDistribution: definition.muscleDistribution, aliases: definition.aliases,
    notes, copiedFromProfileId: profileId, updatedAt: new Date().toISOString() })
  return id
}
