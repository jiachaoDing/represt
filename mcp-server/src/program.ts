import isDeepStrictEqual from 'fast-deep-equal'
import { ReprestApi, ToolError } from './api.js'
import { programSchema, type Program, type ProgramUpdate } from './schemas.js'

function invalid(message: string): never { throw new ToolError('INVALID_CHANGE', message) }
function unique(ids: string[], kind: string) {
  if (new Set(ids).size !== ids.length) invalid(`Duplicate ${kind} IDs.`)
}

export function mergeProgram(current: Program, update: ProgramUpdate): Program {
  const next = structuredClone(current)
  const now = new Date().toISOString()
  const removedPlans = update.removePlanIds ?? []
  unique(removedPlans, 'removed plan')
  unique((update.plans ?? []).flatMap((p) => p.id ? [p.id] : []), 'updated plan')
  for (const id of removedPlans) {
    if (!next.plans.some((p) => p.id === id)) invalid(`Plan ${id} does not exist.`)
    if (update.plans?.some((p) => p.id === id)) invalid(`Cannot update and remove plan ${id}.`)
  }
  next.plans = next.plans.filter((p) => !removedPlans.includes(p.id))
  for (const change of update.plans ?? []) {
    const existing = change.id ? next.plans.find((p) => p.id === change.id) : undefined
    if (change.id && !existing) invalid(`Plan ${change.id} does not exist. Omit ID to create a plan.`)
    if (!existing && !change.name) invalid('A new plan requires a name.')
    const plan = existing ?? { id: crypto.randomUUID(), name: change.name!, createdAt: now, updatedAt: now, exercises: [] }
    const before = structuredClone(plan)
    if (change.name !== undefined) plan.name = change.name
    const removed = change.removeExerciseIds ?? []
    unique(removed, 'removed exercise')
    unique((change.exercises ?? []).flatMap((e) => e.id ? [e.id] : []), 'updated exercise')
    for (const id of removed) {
      if (!plan.exercises.some((e) => e.id === id)) invalid(`Exercise ${id} does not belong to plan ${plan.id}.`)
      if (change.exercises?.some((e) => e.id === id)) invalid(`Cannot update and remove exercise ${id}.`)
    }
    plan.exercises = plan.exercises.filter((e) => !removed.includes(e.id))
    for (const patch of change.exercises ?? []) {
      const exercise = patch.id ? plan.exercises.find((e) => e.id === patch.id) : undefined
      if (patch.id && !exercise) invalid(`Exercise ${patch.id} does not belong to plan ${plan.id}.`)
      if (exercise) Object.assign(exercise, patch)
      else {
        if (!patch.name || patch.targetSets === undefined || patch.restSeconds === undefined) {
          invalid('A new exercise requires name, targetSets and restSeconds.')
        }
        plan.exercises.push({
          catalogExerciseId: null, measurementType: 'weightReps', weightKg: null, reps: null,
          durationSeconds: null, distanceMeters: null, ...patch,
          id: crypto.randomUUID(), planId: plan.id, name: patch.name,
          targetSets: patch.targetSets, restSeconds: patch.restSeconds, order: plan.exercises.length,
        })
      }
    }
    if (change.exerciseOrder) {
      unique(change.exerciseOrder, 'exercise order')
      if (change.exerciseOrder.length !== plan.exercises.length) invalid('exerciseOrder must contain every exercise ID exactly once.')
      plan.exercises = change.exerciseOrder.map((id) => plan.exercises.find((e) => e.id === id) ?? invalid(`Unknown exercise ${id}.`))
    }
    plan.exercises.forEach((exercise, order) => { exercise.order = order })
    if (!isDeepStrictEqual(before, plan)) plan.updatedAt = now
    if (!existing) next.plans.push(plan)
  }
  if (update.cycle === null) next.cycle = null
  else if (update.cycle) {
    const oldSlots = current.cycle?.slots ?? []
    const explicit = update.cycle.slots.flatMap((s) => s.id ? [s.id] : [])
    unique(explicit, 'cycle slot')
    for (const id of explicit) if (!oldSlots.some((s) => s.id === id)) invalid(`Unknown cycle slot ${id}. Omit ID to create a slot.`)
    const used = new Set(explicit)
    const slots = update.cycle.slots.map((slot) => {
      const old = slot.id ? oldSlots.find((s) => s.id === slot.id) : oldSlots.find((s) => s.planId === slot.planId && !used.has(s.id))
      if (old) used.add(old.id)
      return { id: old?.id ?? crypto.randomUUID(), planId: slot.planId }
    })
    const cycle = { id: 'default' as const, ...update.cycle, slots, updatedAt: current.cycle?.updatedAt ?? now }
    if (!isDeepStrictEqual(cycle, current.cycle)) cycle.updatedAt = now
    next.cycle = cycle
  }
  const ids = new Set(next.plans.map((p) => p.id))
  if (next.cycle?.slots.some((s) => s.planId !== null && !ids.has(s.planId))) invalid('Cycle slots reference a removed or missing plan. Update the cycle explicitly.')
  if (next.cycle && next.cycle.anchorIndex >= Math.max(1, next.cycle.slots.length)) invalid('anchorIndex is outside the cycle slots.')
  next.plans.sort((a, b) => a.id.localeCompare(b.id))
  if (new TextEncoder().encode(JSON.stringify(next)).byteLength > 256 * 1024) invalid('The plan document exceeds 256 KiB.')
  return programSchema.parse(next)
}

export async function updateProgram(api: ReprestApi, update: ProgramUpdate) {
  const current = await api.program()
  if (current.version !== update.expectedVersion) throw new ToolError('VERSION_CONFLICT', 'Read the latest program and review differences before saving.')
  if (!current.plans) throw new ToolError('SYNC_REQUIRED', 'Sync in Represt before editing plans.')
  const plans = mergeProgram(current.plans, update)
  if (isDeepStrictEqual(plans, current.plans)) return { ...current, saved: false, verified: true }
  const saved = await api.save({ version: current.version, plans })
  let verified
  try { verified = await api.program() }
  catch { throw new ToolError('READBACK_FAILED', 'The save succeeded, but verification failed. Read the program before making more changes.', false, { saved: true, verified: false }) }
  if (verified.version !== saved.version || !isDeepStrictEqual(verified.plans, plans)) {
    throw new ToolError('READBACK_MISMATCH', 'The save succeeded, but the current program differs. Read it and review concurrent changes; do not retry automatically.', false, { saved: true, verified: false })
  }
  return { ...verified, saved: true, verified: true }
}
