import type { TemplateExercise, WorkoutTemplate } from '../models/types'
import { db } from './app-db'
import { clearTemplateFromTrainingCycle } from './training-cycle'

export type TemplateWithExercises = WorkoutTemplate & {
  exercises: TemplateExercise[]
}

type TemplateExerciseInput = {
  name: string
  targetSets: number
  restSeconds: number
  weightKg?: number | null
  reps?: number | null
}

const TEMPLATE_SEED_KEY = 'trainre.templates.seeded.v1'
let ensureTemplateSeedPromise: Promise<void> | null = null

const demoTemplates: Array<{
  name: string
  exercises: TemplateExerciseInput[]
}> = [
  {
    name: 'A日：拉 + 后链 + 核心',
    exercises: [
      { name: '引体向上', targetSets: 4, restSeconds: 150 },
      { name: '坐姿划船', targetSets: 4, restSeconds: 150 },
      { name: '罗马尼亚硬拉', targetSets: 3, restSeconds: 150 },
      { name: '高位下拉', targetSets: 3, restSeconds: 90 },
      { name: '面拉', targetSets: 3, restSeconds: 90 },
      { name: '悬垂举腿', targetSets: 3, restSeconds: 90 },
    ],
  },
  {
    name: 'B日：推 + 腿 + 核心',
    exercises: [
      { name: '双杠臂屈伸', targetSets: 4, restSeconds: 150 },
      { name: '卧推', targetSets: 4, restSeconds: 150 },
      { name: '深蹲', targetSets: 4, restSeconds: 150 },
      { name: '哑铃坐姿肩推', targetSets: 3, restSeconds: 90 },
      { name: '俯卧撑', targetSets: 3, restSeconds: 90 },
      { name: '平板支撑', targetSets: 3, restSeconds: 90 },
    ],
  },
]

function nowIso() {
  return new Date().toISOString()
}

function normalizeTemplateName(name: string) {
  return name.trim() || '未命名模板'
}

function normalizeExercise(input: Partial<TemplateExerciseInput>) {
  return {
    name: input.name?.trim() || '未命名动作',
    targetSets: Math.max(1, Math.floor(input.targetSets ?? 3)),
    restSeconds: Math.max(0, Math.floor(input.restSeconds ?? 90)),
    weightKg: input.weightKg ?? null,
    reps: input.reps ?? null,
  }
}

async function touchTemplate(templateId: string) {
  await db.workoutTemplates.update(templateId, { updatedAt: nowIso() })
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
        ...exercise,
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
