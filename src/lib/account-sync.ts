import { db } from '../db/app-db'
import { AccountApiError, fetchAccountPlans, uploadAccountData } from './account-api'
import { backupTableNames, buildFullDataBackup } from './full-data-backup'
import { backupWithPlans, chooseAccountPlans, plansFromBackup, planSignature } from './account-plans'
import { notifyPlansChanged } from './plan-change-events'
import type { AccountPlans, AccountSession, AccountSyncState } from './account-types'

export class AccountPlanConflict extends Error {
  readonly local: AccountPlans
  readonly cloud: AccountPlans
  readonly version: number
  constructor(local: AccountPlans, cloud: AccountPlans, version: number) {
    super('PLAN_CONFLICT')
    this.local = local; this.cloud = cloud; this.version = version
  }
}

export type AccountResolution = { source: 'local' | 'cloud'; version: number; localSignature: string }

async function applyPending(session: AccountSession, state: AccountSyncState) {
  const pending = state.pending!
  let receipt: { syncedAt: string }
  try { receipt = await uploadAccountData(session, pending) }
  catch (error) {
    if (error instanceof AccountApiError && ['VERSION_CONFLICT', 'OPERATION_CONFLICT'].includes(error.code)) {
      await db.transaction('rw', db.accountSync, async () => {
        const current = await db.accountSync.get(session.user.id)
        if (current?.pending?.operationId === pending.operationId) await db.accountSync.update(state.id, { pending: null })
      })
    }
    throw error
  }
  let localChanged = false
  await db.transaction('rw', [...backupTableNames.map((name) => db.table(name)), db.accountSync], async () => {
    const current = await db.accountSync.get(session.user.id)
    if (current?.pending?.operationId !== pending.operationId) throw new AccountApiError('LOCAL_CHANGED')
    const local = plansFromBackup(await buildFullDataBackup())
    if (planSignature(local) !== pending.expectedLocalSignature && planSignature(local) !== planSignature(pending.target)) {
      await db.accountSync.update(state.id, { pending: null })
      localChanged = true
      return
    }
    const timestamp = new Date().toISOString()
    const previous = new Map(local.plans.map((plan) => [plan.id, plan]))
    const target = pending.target
    await db.workoutPlans.clear()
    await db.planExercises.clear()
    await db.trainingCycles.clear()
    if (target.plans.length) {
      await db.workoutPlans.bulkPut(target.plans.map((plan) => ({ id: plan.id, name: plan.name,
        createdAt: previous.get(plan.id)?.createdAt ?? plan.createdAt,
        updatedAt: previous.has(plan.id) && planSignature({ plans: [previous.get(plan.id)!], cycle: null }) ===
          planSignature({ plans: [plan], cycle: null }) ? previous.get(plan.id)!.updatedAt : timestamp,
      })))
      const exercises = target.plans.flatMap((plan) => plan.exercises)
      if (exercises.length) await db.planExercises.bulkPut(exercises)
    }
    if (target.cycle) await db.trainingCycles.put(target.cycle)
    await db.accountSync.put({ id: state.id, pending: null, baseline: target, syncedAt: receipt.syncedAt })
  })
  if (localChanged) throw new AccountApiError('LOCAL_CHANGED')
  notifyPlansChanged(null)
  return receipt.syncedAt
}

let syncing = false

export async function syncAccount(session: AccountSession, resolution?: AccountResolution) {
  if (syncing) throw new AccountApiError('BUSY')
  syncing = true
  try {
    const saved = await db.accountSync.get(session.user.id)
    if (saved?.pending) return await applyPending(session, saved)
    const cloud = await fetchAccountPlans(session)
    const backup = await buildFullDataBackup()
    const local = plansFromBackup(backup)
    const signature = planSignature(local)
    let choice = chooseAccountPlans(local, cloud.plans, saved?.baseline ?? null)
    if (resolution) {
      if (resolution.version !== cloud.version || resolution.localSignature !== signature) throw new AccountApiError('VERSION_CONFLICT')
      choice = resolution.source
    }
    if (choice === 'conflict') throw new AccountPlanConflict(local, cloud.plans!, cloud.version)
    const target = choice === 'cloud' ? cloud.plans! : local
    const state: AccountSyncState = { id: session.user.id, baseline: saved?.baseline ?? null,
      syncedAt: saved?.syncedAt ?? null, pending: { operationId: crypto.randomUUID(), version: cloud.version,
        backup: backupWithPlans(backup, target), expectedLocalSignature: signature, target } }
    await db.transaction('rw', [...backupTableNames.map((name) => db.table(name)), db.accountSync], async () => {
      if ((await db.accountSync.get(session.user.id))?.pending) throw new AccountApiError('BUSY')
      if (planSignature(plansFromBackup(await buildFullDataBackup())) !== signature) throw new AccountApiError('LOCAL_CHANGED')
      await db.accountSync.put(state)
    })
    return await applyPending(session, state)
  } finally { syncing = false }
}
