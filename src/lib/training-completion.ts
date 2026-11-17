import type { PerformedExercise, SessionPlanItem, SetRecord } from '../models/types'

/** Daily saved targets keep historical completion independent of today's templates. */
export function getSessionCompletionRatios(
  planItems: SessionPlanItem[],
  exercises: PerformedExercise[],
  records: SetRecord[],
) {
  const tasks = new Map<string, { sessionId: string; target: number; completed: Set<number> }>()
  const exerciseTasks = new Map<string, string>()
  const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const targetSets = (value: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0

  for (const item of planItems) {
    tasks.set(`item:${item.id}`, { sessionId: item.sessionId, target: targetSets(item.targetSets), completed: new Set() })
  }
  for (const exercise of exercises) {
    const itemKey = `item:${exercise.planItemId}`
    const item = tasks.get(itemKey)
    const key = item?.sessionId === exercise.sessionId ? itemKey : `performed:${exercise.id}`
    if (!tasks.has(key)) {
      tasks.set(key, { sessionId: exercise.sessionId, target: targetSets(exercise.targetSets), completed: new Set() })
    }
    exerciseTasks.set(exercise.id, key)
  }
  for (const record of records) {
    const exercise = exercisesById.get(record.performedExerciseId)
    if (!exercise || exercise.sessionId !== record.sessionId ||
        (record.status ?? 'completed') !== 'completed' || (record.kind ?? 'working') !== 'working' ||
        !Number.isInteger(record.setNumber) || record.setNumber <= 0) continue
    tasks.get(exerciseTasks.get(exercise.id)!)!.completed.add(record.setNumber)
  }
  const totals = new Map<string, { target: number; completed: number }>()
  for (const task of tasks.values()) {
    const total = totals.get(task.sessionId) ?? { target: 0, completed: 0 }
    total.target += task.target
    total.completed += Math.min(task.target, task.completed.size)
    totals.set(task.sessionId, total)
  }
  return new Map([...totals].map(([id, total]) => [id, total.target > 0 ? total.completed / total.target : 0]))
}

export function getTrainingCompletionColor(color: string, completion: number) {
  const ratio = Math.max(0, Math.min(1, completion))
  if (ratio === 1) return color
  return `color-mix(in srgb, ${color} ${Number((ratio * 100).toFixed(2))}%, var(--heatmap-level-0))`
}
