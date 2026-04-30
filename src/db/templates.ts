import type { SessionPlanItem, TemplateExercise, WorkoutTemplate } from '../models/types'
import i18n from '../i18n'
import { resolveCatalogExerciseId } from '../lib/exercise-name'
import { buildSetRecordValuesForMeasurement, getMeasurementTypeForExercise } from '../lib/set-record-measurement'
import { db } from './app-db'
import { clearTemplateFromTrainingCycle } from './training-cycle'

export type TemplateWithExercises = WorkoutTemplate & {
  exercises: TemplateExercise[]
}

type TemplateExerciseInput = {
  name: string
  catalogExerciseId?: string | null
  targetSets: number
  restSeconds: number
  weightKg?: number | null
  reps?: number | null
  durationSeconds?: number | null
  distanceMeters?: number | null
}

type SessionPlanTemplateSource = Pick<
  SessionPlanItem,
  | 'name'
  | 'catalogExerciseId'
  | 'targetSets'
  | 'restSeconds'
  | 'defaultWeightKg'
  | 'defaultReps'
  | 'defaultDurationSeconds'
  | 'defaultDistanceMeters'
  | 'order'
>

const TEMPLATE_SEED_KEY = 'trainre.templates.seeded.v3'
let ensureTemplateSeedPromise: Promise<void> | null = null

const demoTemplateBlueprints: Array<{
  nameKey: string
  exercises: Array<Omit<TemplateExerciseInput, 'name'> & { exerciseId: string }>
}> = [
  {
    nameKey: 'push',
    exercises: [
      { exerciseId: 'barbellBenchPress', targetSets: 4, restSeconds: 150 },
      { exerciseId: 'dumbbellShoulderPress', targetSets: 3, restSeconds: 120 },
      { exerciseId: 'dip', targetSets: 3, restSeconds: 120 },
      { exerciseId: 'tricepsPushdown', targetSets: 3, restSeconds: 90 },
    ],
  },
  {
    nameKey: 'pull',
    exercises: [
      { exerciseId: 'pullUp', targetSets: 4, restSeconds: 150 },
      { exerciseId: 'seatedRow', targetSets: 4, restSeconds: 120 },
      { exerciseId: 'latPulldown', targetSets: 3, restSeconds: 120 },
      { exerciseId: 'facePull', targetSets: 3, restSeconds: 90 },
    ],
  },
  {
    nameKey: 'legs',
    exercises: [
      { exerciseId: 'barbellSquat', targetSets: 4, restSeconds: 150 },
      { exerciseId: 'romanianDeadlift', targetSets: 3, restSeconds: 150 },
      { exerciseId: 'legExtension', targetSets: 3, restSeconds: 90 },
      { exerciseId: 'legCurl', targetSets: 3, restSeconds: 90 },
    ],
  },
  {
    nameKey: 'upper',
    exercises: [
      { exerciseId: 'barbellBenchPress', targetSets: 3, restSeconds: 150 },
      { exerciseId: 'barbellRow', targetSets: 3, restSeconds: 150 },
      { exerciseId: 'barbellOverheadPress', targetSets: 3, restSeconds: 120 },
      { exerciseId: 'latPulldown', targetSets: 3, restSeconds: 120 },
    ],
  },
  {
    nameKey: 'lower',
    exercises: [
      { exerciseId: 'barbellSquat', targetSets: 4, restSeconds: 150 },
      { exerciseId: 'deadlift', targetSets: 3, restSeconds: 150 },
      { exerciseId: 'lunge', targetSets: 3, restSeconds: 90 },
      { exerciseId: 'standingCalfRaise', targetSets: 3, restSeconds: 90 },
    ],
  },
  {
    nameKey: 'fullBody',
    exercises: [
      { exerciseId: 'barbellSquat', targetSets: 3, restSeconds: 150 },
      { exerciseId: 'barbellBenchPress', targetSets: 3, restSeconds: 150 },
      { exerciseId: 'seatedRow', targetSets: 3, restSeconds: 120 },
      { exerciseId: 'plank', targetSets: 3, restSeconds: 60 },
    ],
  },
]

function getLocalizedSeedTemplates() {
  return demoTemplateBlueprints.map((template) => ({
    name: i18n.t(`templates.seed.${template.nameKey}`),
    exercises: template.exercises.map((exercise) => ({
      ...exercise,
      name: i18n.t(`names.${exercise.exerciseId}`, { ns: 'exercises' }),
    })),
  }))
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeTemplateName(name: string) {
  return name.trim() || '未命名模板'
}

function normalizeExercise(input: Partial<TemplateExerciseInput>) {
  const name = input.name?.trim() || '未命名动作'
  const catalogExerciseId = resolveCatalogExerciseId({ name, catalogExerciseId: input.catalogExerciseId })
  const measurementType = getMeasurementTypeForExercise({ name, catalogExerciseId })
  const values = buildSetRecordValuesForMeasurement(measurementType, {
    distanceMeters: input.distanceMeters ?? null,
    durationSeconds: input.durationSeconds ?? null,
    reps: input.reps ?? null,
    weightKg: input.weightKg ?? null,
  })

  return {
    name,
    catalogExerciseId,
    targetSets: Math.max(1, Math.floor(input.targetSets ?? 3)),
    restSeconds: Math.max(0, Math.floor(input.restSeconds ?? 90)),
    ...values,
  }
}

async function touchTemplate(templateId: string) {
  await db.workoutTemplates.update(templateId, { updatedAt: nowIso() })
}

function buildTemplateExercisesFromSessionPlanItems(
  templateId: string,
  planItems: SessionPlanTemplateSource[],
) {
  return [...planItems]
    .sort((left, right) => left.order - right.order)
    .map((item, order) => ({
      id: crypto.randomUUID(),
      templateId,
      name: item.name,
      catalogExerciseId: item.catalogExerciseId ?? null,
      targetSets: item.targetSets,
      restSeconds: item.restSeconds,
      weightKg: item.defaultWeightKg ?? null,
      reps: item.defaultReps ?? null,
      durationSeconds: item.defaultDurationSeconds ?? null,
      distanceMeters: item.defaultDistanceMeters ?? null,
      order,
    })) satisfies TemplateExercise[]
}

export async function ensureTemplateSeedData() {
  if (ensureTemplateSeedPromise) {
    await ensureTemplateSeedPromise
    return
  }

  ensureTemplateSeedPromise = (async () => {
    if (localStorage.getItem(TEMPLATE_SEED_KEY) === 'true') {
      return
    }

    const templateCount = await db.workoutTemplates.count()
    if (templateCount > 0) {
      localStorage.setItem(TEMPLATE_SEED_KEY, 'true')
      return
    }

    const timestamp = nowIso()
    const demoTemplates = getLocalizedSeedTemplates()
    const templates = demoTemplates.map((template) => ({
      id: crypto.randomUUID(),
      name: template.name,
      createdAt: timestamp,
      updatedAt: timestamp,
    }))

    const exercises = templates.flatMap((template, templateIndex) =>
      demoTemplates[templateIndex].exercises.map((exercise, order) => ({
        id: crypto.randomUUID(),
        templateId: template.id,
        name: exercise.name,
        catalogExerciseId: exercise.exerciseId,
        targetSets: exercise.targetSets,
        restSeconds: exercise.restSeconds,
        weightKg: exercise.weightKg,
        reps: exercise.reps,
        durationSeconds: exercise.durationSeconds,
        distanceMeters: exercise.distanceMeters,
        order,
      })),
    )

    await db.transaction('rw', db.workoutTemplates, db.templateExercises, async () => {
      await db.workoutTemplates.bulkAdd(templates)
      await db.templateExercises.bulkAdd(exercises)
    })

    localStorage.setItem(TEMPLATE_SEED_KEY, 'true')
  })()

  try {
    await ensureTemplateSeedPromise
  } finally {
    ensureTemplateSeedPromise = null
  }
}

export async function listTemplatesWithExercises() {
  await ensureTemplateSeedData()

  const [templates, exercises] = await Promise.all([
    db.workoutTemplates.toArray(),
    db.templateExercises.toArray(),
  ])

  const exercisesByTemplate = new Map<string, TemplateExercise[]>()

  for (const exercise of exercises) {
    const current = exercisesByTemplate.get(exercise.templateId) ?? []
    current.push(exercise)
    exercisesByTemplate.set(exercise.templateId, current)
  }

  return templates
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((template) => ({
      ...template,
      exercises: (exercisesByTemplate.get(template.id) ?? []).sort((left, right) => left.order - right.order),
    }))
}

export async function createTemplate(name: string) {
  const timestamp = nowIso()
  const template: WorkoutTemplate = {
    id: crypto.randomUUID(),
    name: normalizeTemplateName(name),
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.workoutTemplates.add(template)

  return template
}

export async function createTemplateFromSessionPlanItems(
  name: string,
  planItems: SessionPlanTemplateSource[],
) {
  if (planItems.length === 0) {
    return null
  }

  const timestamp = nowIso()
  const template: WorkoutTemplate = {
    id: crypto.randomUUID(),
    name: normalizeTemplateName(name),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const exercises = buildTemplateExercisesFromSessionPlanItems(template.id, planItems)

  await db.transaction('rw', db.workoutTemplates, db.templateExercises, async () => {
    await db.workoutTemplates.add(template)
    await db.templateExercises.bulkAdd(exercises)
  })

  return { ...template, exercises } satisfies TemplateWithExercises
}

export async function updateTemplateName(templateId: string, name: string) {
  await db.workoutTemplates.update(templateId, {
    name: normalizeTemplateName(name),
    updatedAt: nowIso(),
  })
}

export async function deleteTemplate(templateId: string) {
  await db.transaction('rw', db.workoutTemplates, db.templateExercises, async () => {
    await db.templateExercises.where('templateId').equals(templateId).delete()
    await db.workoutTemplates.delete(templateId)
  })

  await clearTemplateFromTrainingCycle(templateId)
}

export async function createTemplateExercise(templateId: string, input: Partial<TemplateExerciseInput>) {
  const normalized = normalizeExercise(input)
  const exercises = await db.templateExercises.where('templateId').equals(templateId).toArray()
  const nextOrder = exercises.reduce((maxOrder, exercise) => Math.max(maxOrder, exercise.order), -1) + 1

  const exercise: TemplateExercise = {
    id: crypto.randomUUID(),
    templateId,
    order: nextOrder,
    ...normalized,
  }

  await db.templateExercises.add(exercise)
  await touchTemplate(templateId)

  return exercise
}

export async function importTemplateExercises(targetTemplateId: string, sourceExerciseIds: string[]) {
  if (sourceExerciseIds.length === 0) {
    return []
  }

  const sourceExercises = (await db.templateExercises.bulkGet(sourceExerciseIds)).filter(
    (exercise): exercise is TemplateExercise =>
      exercise !== undefined && exercise.templateId !== targetTemplateId,
  )

  if (sourceExercises.length === 0) {
    return []
  }

  const sourceExerciseMap = new Map(sourceExercises.map((exercise) => [exercise.id, exercise]))
  const orderedSourceExercises = sourceExerciseIds
    .map((exerciseId) => sourceExerciseMap.get(exerciseId) ?? null)
    .filter((exercise): exercise is TemplateExercise => exercise !== null)
  const targetExercises = await db.templateExercises.where('templateId').equals(targetTemplateId).toArray()
  const nextOrder = targetExercises.reduce((maxOrder, exercise) => Math.max(maxOrder, exercise.order), -1) + 1
  const importedExercises = orderedSourceExercises.map((exercise, index) => ({
    id: crypto.randomUUID(),
    templateId: targetTemplateId,
    name: exercise.name,
    catalogExerciseId: exercise.catalogExerciseId ?? null,
    targetSets: exercise.targetSets,
    restSeconds: exercise.restSeconds,
    weightKg: exercise.weightKg ?? null,
    reps: exercise.reps ?? null,
    durationSeconds: exercise.durationSeconds ?? null,
    distanceMeters: exercise.distanceMeters ?? null,
    order: nextOrder + index,
  }))

  await db.transaction('rw', db.templateExercises, db.workoutTemplates, async () => {
    await db.templateExercises.bulkAdd(importedExercises)
    await touchTemplate(targetTemplateId)
  })

  return importedExercises
}

export async function replaceTemplateExercisesFromSessionPlanItems(
  templateId: string,
  planItems: SessionPlanTemplateSource[],
) {
  if (planItems.length === 0) {
    return null
  }

  const template = await db.workoutTemplates.get(templateId)
  if (!template) {
    return null
  }

  const updatedAt = nowIso()
  const exercises = buildTemplateExercisesFromSessionPlanItems(templateId, planItems)

  await db.transaction('rw', db.workoutTemplates, db.templateExercises, async () => {
    await db.templateExercises.where('templateId').equals(templateId).delete()
    await db.templateExercises.bulkAdd(exercises)
    await db.workoutTemplates.update(templateId, { updatedAt })
  })

  return { ...template, updatedAt, exercises } satisfies TemplateWithExercises
}

export async function updateTemplateExercise(
  exerciseId: string,
  input: Partial<TemplateExerciseInput>,
) {
  const current = await db.templateExercises.get(exerciseId)
  if (!current) {
    return
  }

  await db.templateExercises.update(exerciseId, normalizeExercise({ ...current, ...input }))
  await touchTemplate(current.templateId)
}

export async function deleteTemplateExercise(exerciseId: string) {
  const current = await db.templateExercises.get(exerciseId)
  if (!current) {
    return
  }

  await db.templateExercises.delete(exerciseId)
  await touchTemplate(current.templateId)
}

export async function reorderTemplateExercises(templateId: string, orderedExerciseIds: string[]) {
  const exercises = await db.templateExercises.where('templateId').equals(templateId).sortBy('order')
  if (exercises.length !== orderedExerciseIds.length) {
    return
  }

  const exerciseIdSet = new Set(exercises.map((exercise) => exercise.id))
  if (orderedExerciseIds.some((exerciseId) => !exerciseIdSet.has(exerciseId))) {
    return
  }

  await db.transaction('rw', db.templateExercises, db.workoutTemplates, async () => {
    await Promise.all(
      orderedExerciseIds.map((exerciseId, order) =>
        db.templateExercises.update(exerciseId, { order }),
      ),
    )
    await touchTemplate(templateId)
  })
}
