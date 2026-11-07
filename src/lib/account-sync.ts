import { db } from '../db/app-db'
import { AccountApiError, fetchAccountData, fetchAccountPlans, uploadAccountData } from './account-api'
import { backupTableNames, buildFullDataBackup, parseFullDataBackupJson, restoreFullDataBackup } from './full-data-backup'
import { backupWithPlans, chooseAccountPlans, plansFromBackup, planSignature } from './account-plans'
import { notifyPlansChanged } from './plan-change-events'
import { accountDeltaIsEmpty, buildAccountDelta, describeAccountSnapshot } from './account-sync-data'
import type { AccountPlans, AccountRestore, AccountSession, AccountSyncState } from './account-types'

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
  let receipt: { version: number; syncedAt: string }
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
  const snapshot = await describeAccountSnapshot(pending.backup, receipt.version)
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
    const target = pending.target
    await db.workoutPlans.clear()
    await db.planExercises.clear()
    await db.trainingCycles.clear()
    if (target.plans.length) {
      await db.workoutPlans.bulkPut(target.plans.map((plan) => ({ id: plan.id, name: plan.name,
        createdAt: plan.createdAt, updatedAt: plan.updatedAt })))
      const exercises = target.plans.flatMap((plan) => plan.exercises)
      if (exercises.length) await db.planExercises.bulkPut(exercises)
    }
    if (target.cycle) await db.trainingCycles.put(target.cycle)
    await db.accountSync.put({ id: state.id, pending: null, baseline: target, syncedAt: receipt.syncedAt, snapshot })
  })
  if (localChanged) throw new AccountApiError('LOCAL_CHANGED')
  notifyPlansChanged(null)
  return { syncedAt: receipt.syncedAt, uploaded: true }
}

let syncing = false

export async function prepareAccountRestore(session: AccountSession): Promise<AccountRestore> {
  const cloud = await fetchAccountPlans(session)
  const snapshot = await fetchAccountData(session, cloud.version)
  const parsed = parseFullDataBackupJson(JSON.stringify(snapshot.backup))
  if (!parsed.ok || !cloud.plans || !snapshot.syncedAt || snapshot.version !== cloud.version) throw new AccountApiError('INVALID_RESPONSE')
  if (snapshot.snapshotVersion !== cloud.snapshotVersion) throw new AccountApiError('VERSION_CONFLICT')
  return { userId: session.user.id, version: cloud.version, syncedAt: snapshot.syncedAt,
    backup: backupWithPlans(parsed.data, cloud.plans),
    snapshot: typeof cloud.snapshotVersion === 'number' ? await describeAccountSnapshot(parsed.data, cloud.snapshotVersion) : null }
}

export async function restoreAccountData(session: AccountSession, restore: AccountRestore) {
  if (syncing) throw new AccountApiError('BUSY')
  if (session.user.id !== restore.userId) throw new AccountApiError('UNAUTHORIZED')
  syncing = true
  try {
    const cloud = await fetchAccountPlans(session)
    if (cloud.version !== restore.version) throw new AccountApiError('VERSION_CONFLICT')
    await restoreFullDataBackup(restore.backup, { id: session.user.id, pending: null,
      baseline: plansFromBackup(restore.backup), syncedAt: restore.syncedAt, snapshot: restore.snapshot ?? null })
    notifyPlansChanged(null)
    return restore.syncedAt
  } finally { syncing = false }
}

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
    const upload = backupWithPlans(backup, target)
    const snapshot = await describeAccountSnapshot(upload, cloud.snapshotVersion ?? 0)
    const delta = saved?.snapshot && saved.snapshot.version === cloud.snapshotVersion
      ? { baseSnapshotVersion: saved.snapshot.version, changes: buildAccountDelta(upload, snapshot, saved.snapshot) } : undefined
    if (delta && accountDeltaIsEmpty(delta.changes) && !cloud.pending && cloud.syncedAt &&
      planSignature(local) === planSignature(target)) {
      return { syncedAt: cloud.syncedAt, uploaded: false }
    }
    const state: AccountSyncState = { id: session.user.id, baseline: saved?.baseline ?? null,
      syncedAt: saved?.syncedAt ?? null, snapshot: saved?.snapshot ?? null,
      pending: { operationId: crypto.randomUUID(), version: cloud.version,
        backup: upload, expectedLocalSignature: signature, target, ...(delta ? { delta } : {}) } }
    await db.transaction('rw', [...backupTableNames.map((name) => db.table(name)), db.accountSync], async () => {
      if ((await db.accountSync.get(session.user.id))?.pending) throw new AccountApiError('BUSY')
      if (planSignature(plansFromBackup(await buildFullDataBackup())) !== signature) throw new AccountApiError('LOCAL_CHANGED')
      await db.accountSync.put(state)
    })
    return await applyPending(session, state)
  } finally { syncing = false }
}
