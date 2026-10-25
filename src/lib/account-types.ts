import type { PlanExercise, TrainingCycle, WorkoutPlan } from '../models/types'
import type { FullDataBackup } from './full-data-backup'
import type { AccountDataDelta, AccountSnapshot } from './account-sync-data'

export type AccountSession = { token: string; user: { id: string; email: string } }
export type AccountPlans = { plans: Array<WorkoutPlan & { exercises: PlanExercise[] }>; cycle: TrainingCycle | null }
export type AccountCloudState = {
  version: number
  syncedAt: string | null
  baseline: AccountPlans | null
  plans: AccountPlans | null
  pending: boolean
  snapshotVersion?: number | null
}
export type AccountRestore = {
  userId: string; version: number; syncedAt: string; backup: FullDataBackup; snapshot?: AccountSnapshot | null
}
export type AccountSyncState = {
  id: string
  baseline: AccountPlans | null
  syncedAt: string | null
  snapshot?: AccountSnapshot | null
  pending: {
    operationId: string
    version: number
    backup: FullDataBackup
    expectedLocalSignature: string
    target: AccountPlans
    delta?: { baseSnapshotVersion: number; changes: AccountDataDelta }
  } | null
}
