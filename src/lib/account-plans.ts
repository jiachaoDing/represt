import type { PlanExercise, TrainingCycle, WorkoutPlan } from '../models/types'
import type { FullDataBackup } from './full-data-backup'
import type { AccountPlans } from './account-types'

export function plansFromBackup(backup: FullDataBackup): AccountPlans {
  const exercises = backup.tables.planExercises as PlanExercise[]
  return {
    plans: (backup.tables.workoutPlans as WorkoutPlan[]).map((plan) => ({
      ...plan,
      exercises: exercises.filter((exercise) => exercise.planId === plan.id)
        .sort((a, b) => a.order - b.order)
        .map((exercise, order) => ({
          ...exercise, order, catalogExerciseId: exercise.catalogExerciseId ?? null,
          measurementType: exercise.measurementType ?? 'weightReps',
          weightKg: exercise.weightKg ?? null, reps: exercise.reps ?? null,
          durationSeconds: exercise.durationSeconds ?? null, distanceMeters: exercise.distanceMeters ?? null,
        })),
    })).sort((a, b) => a.id.localeCompare(b.id)),
    cycle: (backup.tables.trainingCycles[0] as TrainingCycle | undefined) ?? null,
  }
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key, entry]) =>
      key !== 'updatedAt' && key !== 'createdAt' && entry !== undefined,
    ).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonical(entry)]))
  }
  return value
}

export function planSignature(plans: AccountPlans) {
  return JSON.stringify(canonical({ ...plans, plans: [...plans.plans].sort((a, b) => a.id.localeCompare(b.id)) }))
}

export function chooseAccountPlans(local: AccountPlans, remote: AccountPlans | null, baseline: AccountPlans | null) {
  if (!remote || planSignature(local) === planSignature(remote)) return 'local' as const
  if (baseline && planSignature(remote) === planSignature(baseline)) return 'local' as const
  if (baseline && planSignature(local) === planSignature(baseline)) return 'cloud' as const
  return 'conflict' as const
}

export function backupWithPlans(backup: FullDataBackup, plans: AccountPlans): FullDataBackup {
  return { ...backup, tables: { ...backup.tables,
    workoutPlans: plans.plans.map((plan) => ({ id: plan.id, name: plan.name, createdAt: plan.createdAt, updatedAt: plan.updatedAt })),
    planExercises: plans.plans.flatMap((plan) => plan.exercises),
    trainingCycles: plans.cycle ? [plans.cycle] : [],
  } }
}
