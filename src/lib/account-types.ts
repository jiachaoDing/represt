import type { PlanExercise, TrainingCycle, WorkoutPlan } from '../models/types'
import type { FullDataBackup } from './full-data-backup'

export type AccountSession = { token: string; user: { id: string; email: string } }
export type AccountPlans = { plans: Array<WorkoutPlan & { exercises: PlanExercise[] }>; cycle: TrainingCycle | null }
export type AccountCloudState = {
  version: number
  syncedAt: string | null
  baseline: AccountPlans | null
  plans: AccountPlans | null
  pending: boolean
}
export type AccountRestore = { userId: string; version: number; syncedAt: string; backup: FullDataBackup }
export type AccountSyncState = {
  id: string
  baseline: AccountPlans | null
  syncedAt: string | null
  pending: {
    operationId: string
    version: number
    backup: FullDataBackup
    expectedLocalSignature: string
    target: AccountPlans
  } | null
}
