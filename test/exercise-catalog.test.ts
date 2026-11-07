import 'fake-indexeddb/auto'
import { beforeEach, expect, it, vi } from 'vitest'
import { createInstance } from 'i18next'
import Dexie from 'dexie'
import { db } from '../src/db/app-db'
import { exercises, getTrainingDefaults } from '../src/domain/exercise-catalog'
import { legacyCatalog, legacyProfileId } from '../src/domain/exercise-catalog/legacy'
import { resolveCatalogExerciseId } from '../src/lib/exercise-name'
import { normalizeExerciseTables, type ExerciseTables } from '../src/db/exercise-identity'
import { saveExerciseModel, getExercisePersonalRecords, getExerciseRecordDetail } from '../src/db/exercise-records'
import { copyExerciseDefinition, getExerciseDefinition, setExerciseHidden, resetLegacyExerciseOverride } from '../src/db/exercise-models'
import { createPlanWithExercises } from '../src/db/plans'
import { getSetRecordStatistics } from '../src/lib/set-record-measurement'
import { importPlanTransferData, buildPlanTemplateExport } from '../src/lib/plan-transfer-data'
import { parsePlanTransferJson } from '../src/lib/plan-transfer-parser'
import { buildFullDataBackup, restoreFullDataBackup } from '../src/lib/full-data-backup'
import { searchExerciseDefinitions } from '../src/lib/exercise-search'
import { listExerciseDefinitions } from '../src/db/exercise-models'
import enCommon from '../src/locales/en/common'
import enExercises from '../src/locales/en/exercises'
import enMuscles from '../src/locales/en/muscles'
import type { SetRecord } from '../src/models/types'

vi.mock('../src/i18n', () => ({ default: { t: (key: string) => key } }))
const now = '2026-11-06T10:00:00.000Z'
beforeEach(async () => { await db.open(); for (const table of db.tables) await table.clear() })
const blankTables = (): ExerciseTables => ({ planExercises: [], sessionPlanItems: [], performedExercises: [], setRecords: [], exerciseProfiles: [] })
const customInput = { catalogExerciseId: null, profileId: null, name: 'My press', muscleDistribution: [], movementPattern: 'horizontal_push' as const, measurementType: 'weightReps' as const }

it('retains every v21 ID, recording mode and accounting ratio while expanding the catalog', () => {
  expect(exercises.length).toBe(126)
  expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(exercises.length)
  expect(new Set(exercises.map((exercise) => exercise.slug)).size).toBe(exercises.length)
  for (const original of legacyCatalog) {
    const current = exercises.find((exercise) => exercise.id === original.id)!
    expect(current.measurementType).toBe(original.measurementType)
    expect(current.muscleDistribution).toEqual(original.muscleDistribution)
    expect(current.mechanic).toBeTruthy()
  }
})

it('keeps the frozen legacy name matcher and treats explicit custom references as authoritative', () => {
  expect(legacyProfileId({ name: '  杠铃卧推 ' })).toBe('catalog:barbellBenchPress')
  expect(resolveCatalogExerciseId({ name: '杠铃卧推', exerciseProfileId: 'custom:one' })).toBeNull()
  expect(resolveCatalogExerciseId({ name: 'Cable Pallof Press' })).toBeNull()
})

it('normalizes legacy backups idempotently without changing actual values or merging similar names', () => {
  const tables = blankTables()
  tables.planExercises.push({ id: 'p', planId: 'plan', name: '  Custom Press ', measurementType: 'weightReps', targetSets: 4, restSeconds: 90, order: 0 })
  tables.performedExercises.push({ id: 'e', sessionId: 's', planItemId: null, planExerciseId: null, name: 'custom press', targetSets: 4, restSeconds: 90, completedSets: 1, order: 0, startedAt: now, lastCompletedAt: now, restEndsAt: null })
  const record: SetRecord = { id: 'set', sessionId: 's', performedExerciseId: 'e', setNumber: 1, completedAt: now, weightKg: 47.5, reps: 8, durationSeconds: null, distanceMeters: null }
  tables.setRecords.push(record)
  const normalized = normalizeExerciseTables(tables)
  expect(normalizeExerciseTables(normalized)).toEqual(normalized)
  expect(tables.planExercises[0]).not.toHaveProperty('exerciseProfileId')
  expect(normalized.planExercises[0].exerciseProfileId).toBe('name:custom press')
  expect(normalized.setRecords[0]).toMatchObject(record)
  expect(normalized.exerciseProfiles).toHaveLength(1)
  expect(normalized.exerciseProfiles[0].deletedAt).toBeUndefined()
  const modern = blankTables()
  modern.planExercises.push({ ...tables.planExercises[0], exerciseProfileId: 'custom:assisted', loadMode: 'assisted' })
  expect(normalizeExerciseTables(modern).exerciseProfiles[0].loadMode).toBe('assisted')
})

it('upgrades a real v16 database through v22 while retaining historical values, overrides and PR groups', async () => {
  const stores = Object.fromEntries(db.tables.filter((table) => !['accountSync', 'sharedPlanRecords'].includes(table.name)).map((table) => [table.name,
    [table.schema.primKey.src, ...table.schema.indexes.filter((index) => index.name !== 'exerciseProfileId').map((index) => index.src)].join(', ')]))
  await db.delete()
  const old = new Dexie('trainre')
  old.version(16).stores(stores)
  await old.open()
  const source = { name: '杠铃卧推', targetSets: 3, restSeconds: 90, order: 0 }
  await old.table('workoutSessions').put({ id: 's', sessionDateKey: '2026-11-06', createdAt: now })
  await old.table('exerciseProfiles').put({ id: 'catalog:barbellBenchPress', catalogExerciseId: 'barbellBenchPress', name: 'My bench', muscleDistribution: [{ muscleGroupId: 'chest', ratio: 1 }], updatedAt: now })
  await old.table('planExercises').put({ ...source, id: 'p', planId: 'plan' })
  await old.table('sessionPlanItems').put({ ...source, id: 'item', sessionId: 's', planExerciseId: 'p', createdAt: now, sourcePlanSnapshot: source })
  await old.table('performedExercises').put({ ...source, id: 'e', sessionId: 's', planItemId: 'item', planExerciseId: 'p', completedSets: 1, startedAt: now, lastCompletedAt: now, restEndsAt: null })
  const record = { id: 'r', sessionId: 's', performedExerciseId: 'e', setNumber: 1, completedAt: now, weightKg: 72.5, reps: 9, durationSeconds: null, distanceMeters: null }
  await old.table('setRecords').put(record)
  old.close()
  await db.open()
  expect(db.verno).toBe(22)
  expect(await db.setRecords.get('r')).toMatchObject(record)
  expect((await db.sessionPlanItems.get('item'))?.sourcePlanSnapshot?.exerciseProfileId).toBe('catalog:barbellBenchPress')
  expect((await db.exerciseProfiles.get('catalog:barbellBenchPress'))?.name).toBe('My bench')
  expect(await getExercisePersonalRecords({ ...source, id: 'current', exerciseProfileId: 'catalog:barbellBenchPress', measurementType: 'weightReps' })).toEqual({ weightKg: 72.5, reps: 9 })
})

it('keeps custom identity, history and PR through a rename and gives copies independent PRs', async () => {
  const result = await saveExerciseModel(customInput)
  expect(result.status).toBe('saved')
  if (result.status !== 'saved') throw Error('save failed')
  const id = result.profileId
  const plan = await createPlanWithExercises('Plan', [{ name: 'My press', exerciseProfileId: id }])
  expect(plan!.exercises[0].exerciseProfileId).toBe(id)
  await db.workoutSessions.put({ id: 's', sessionDateKey: '2026-11-06', createdAt: now })
  await db.performedExercises.put({ ...plan!.exercises[0], id: 'e', sessionId: 's', planItemId: null, planExerciseId: null, completedSets: 1, startedAt: now, lastCompletedAt: now, restEndsAt: null })
  await db.setRecords.put({ id: 'r', sessionId: 's', performedExerciseId: 'e', setNumber: 1, completedAt: now, measurementType: 'weightReps', weightKg: 60, reps: 8, durationSeconds: null, distanceMeters: null })
  const renamed = await saveExerciseModel({ ...customInput, profileId: id, name: 'Renamed press' })
  expect(renamed).toEqual({ status: 'saved', profileId: id })
  const source = { id: 'current', exerciseProfileId: id, name: 'Renamed press', measurementType: 'weightReps' as const }
  expect(await getExercisePersonalRecords(source)).toEqual({ weightKg: 60, reps: 8 })
  await db.performedExercises.put({ ...plan!.exercises[0], id: 'assisted', sessionId: 's', planItemId: null, planExerciseId: null, loadMode: 'assisted', completedSets: 1, startedAt: now, lastCompletedAt: now, restEndsAt: null })
  await db.setRecords.put({ id: 'assisted-set', sessionId: 's', performedExerciseId: 'assisted', setNumber: 1, completedAt: '2026-11-06T11:00:00.000Z', measurementType: 'weightReps', loadMode: 'assisted', weightKg: 80, reps: 12, durationSeconds: null, distanceMeters: null })
  expect(await getExercisePersonalRecords({ ...source, loadMode: 'assisted' })).toEqual({ weightKg: null, reps: 12 })
  expect(await getExercisePersonalRecords(source)).toEqual({ weightKg: 60, reps: 8 })
  expect((await getExerciseRecordDetail(id))?.primaryMetric).toMatchObject({ kind: 'maxReps', value: 12 })
  const copied = await copyExerciseDefinition(id, 'Copied press')
  expect(await getExercisePersonalRecords({ ...source, exerciseProfileId: copied })).toEqual({ weightKg: null, reps: null })
  expect((await db.planExercises.get(plan!.exercises[0].id))?.name).toBe('My press')
})

it('makes built-ins read-only and preserves hiding when resetting old overrides', async () => {
  expect((await saveExerciseModel({ ...customInput, profileId: 'catalog:plank', catalogExerciseId: 'plank' })).status).toBe('notFound')
  await db.exerciseProfiles.put({ id: 'catalog:plank', name: 'My plank', muscleDistribution: [{ muscleGroupId: 'arms', ratio: 1 }], legacyOverride: true, updatedAt: now })
  await setExerciseHidden('catalog:plank', true)
  await resetLegacyExerciseOverride('catalog:plank')
  const definition = await getExerciseDefinition('catalog:plank')
  expect(definition?.hidden).toBe(true)
  expect(definition?.legacyOverride).toBe(false)
  expect(definition?.muscleDistribution).toEqual(exercises.find((exercise) => exercise.id === 'plank')!.muscleDistribution)
  await setExerciseHidden('catalog:plank', false)
  expect((await getExerciseDefinition('catalog:plank'))?.hidden).toBe(false)
})

it('excludes assistance from weight PR and tonnage without reinterpreting legacy records', () => {
  const record: SetRecord = { id: 'r', sessionId: 's', performedExerciseId: 'e', setNumber: 1, completedAt: now, measurementType: 'weightReps', weightKg: 40, reps: 8, durationSeconds: null, distanceMeters: null }
  expect(getSetRecordStatistics(record, 'weightReps').weightRepsVolume).toBe(320)
  const assisted = getSetRecordStatistics({ ...record, loadMode: 'assisted' }, 'weightReps')
  expect(assisted.highestWeight).toBeNull()
  expect(assisted.weightRepsVolume).toBeNull()
  expect(assisted.maxReps).toBe(8)
  expect(getTrainingDefaults({ primaryEquipment: 'barbell', loadMode: 'assisted' }).weightIncrementKg).toBeNull()
})

it('round-trips v2 custom metadata and stable references without overwriting same-name local exercises', async () => {
  const saved = await saveExerciseModel({ ...customInput, aliases: ['press alias'], notes: 'Own notes', metadata: { mechanic: 'compound', primaryEquipment: 'barbell', trainingDefaults: { repsRange: { min: 5, max: 9 }, weightIncrementKg: 1.25 } } })
  if (saved.status !== 'saved') throw Error('save failed')
  const plan = await createPlanWithExercises('P', [{ name: 'My press', exerciseProfileId: saved.profileId, targetSets: 2 }])
  await setExerciseHidden(saved.profileId, true)
  const exported = await buildPlanTemplateExport([plan!.id])
  const parsed = parsePlanTransferJson(JSON.stringify(exported), 'P')
  if (!parsed.ok) throw Error('parse failed')
  const imported = await importPlanTransferData(parsed.data)
  const importedId = imported[0].exercises[0].exerciseProfileId!
  expect(importedId).not.toBe(saved.profileId)
  expect((await db.exerciseProfiles.get(importedId))?.trainingDefaults?.weightIncrementKg).toBe(1.25)
  const again = await importPlanTransferData(parsed.data)
  expect(again[0].exercises[0].exerciseProfileId).toBe(importedId)
  expect((await db.exerciseProfiles.get(saved.profileId))?.name).toBe('My press')
})

it('applies defaults only at creation and keeps rep suggestions out of actual defaults', async () => {
  const saved = await saveExerciseModel({ ...customInput, metadata: { trainingDefaults: { targetSets: 3, restSeconds: 120, repsRange: { min: 6, max: 10 } } } })
  if (saved.status !== 'saved') throw Error('save failed')
  const plan = await createPlanWithExercises('P', [{ name: 'My press', exerciseProfileId: saved.profileId }])
  expect(plan!.exercises[0]).toMatchObject({ targetSets: 3, restSeconds: 120, reps: null, weightKg: null })
  await saveExerciseModel({ ...customInput, profileId: saved.profileId, metadata: { trainingDefaults: { targetSets: 9 } } })
  expect((await db.planExercises.get(plan!.exercises[0].id))?.targetSets).toBe(3)
})

it('restores v1 files through the normalizer and rolls back failed restores', async () => {
  const backup = await buildFullDataBackup()
  backup.schemaVersion = 1
  backup.tables.planExercises = [{ id: 'p', planId: 'plan', name: 'Old custom', targetSets: 2, restSeconds: 90, order: 0 }]
  await restoreFullDataBackup(backup)
  expect((await db.planExercises.get('p'))?.exerciseProfileId).toBe('name:old custom')
  const invalid = structuredClone(backup)
  invalid.tables.workoutSessions = [{ id: 'a', sessionDateKey: '2026-11-06' }, { id: 'b', sessionDateKey: '2026-11-06' }]
  await expect(restoreFullDataBackup(invalid)).rejects.toThrow()
  expect((await db.planExercises.get('p'))?.name).toBe('Old custom')
})

it('uses the same search for custom aliases and built-in classification', async () => {
  await saveExerciseModel({ ...customInput, aliases: ['specialword'], metadata: { primaryEquipment: 'barbell' } })
  const i18n = createInstance()
  await i18n.init({ lng: 'en', resources: { en: { common: enCommon, exercises: enExercises, muscles: enMuscles } } })
  const definitions = await listExerciseDefinitions()
  expect(searchExerciseDefinitions(definitions, 'specialword', i18n.t)[0].name).toBe('My press')
  expect(searchExerciseDefinitions(definitions, 'Pallof', i18n.t)[0].catalogExerciseId).toBe('oedb:1194')
  expect(searchExerciseDefinitions(definitions, 'Pallof', i18n.t, { equipment: 'dumbbell' })).toHaveLength(0)
})
