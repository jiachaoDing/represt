import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../src/db/app-db'
import { AccountApiError, fetchAccountData, fetchAccountPlans, uploadAccountData } from '../src/lib/account-api'
import { AccountPlanConflict, prepareAccountRestore, restoreAccountData, syncAccount } from '../src/lib/account-sync'
import { backupWithPlans, chooseAccountPlans, plansFromBackup, planSignature } from '../src/lib/account-plans'
import { buildFullDataBackup, restoreFullDataBackup } from '../src/lib/full-data-backup'
import type { AccountPlans } from '../src/lib/account-types'
import { describeAccountSnapshot } from '../src/lib/account-sync-data'

vi.mock('../src/lib/account-api', async (original) => ({
  ...await original<typeof import('../src/lib/account-api')>(), fetchAccountPlans: vi.fn(), fetchAccountData: vi.fn(), uploadAccountData: vi.fn(),
}))

const session = { token: 'test-token-never-export', user: { id: 'user-1', email: 'test@example.test' } }
const time = '2026-10-24T10:00:00.000Z'
afterEach(() => { vi.unstubAllGlobals() })

async function seed() {
  await db.workoutPlans.put({ id: 'plan-1', name: 'Upper', createdAt: time, updatedAt: time })
  await db.planExercises.put({ id: 'exercise-1', planId: 'plan-1', name: 'Bench', targetSets: 3, restSeconds: 90,
    weightKg: 60, reps: 8, order: 0 })
  await db.setRecords.put({ id: 'set-1', sessionId: 'session-1', performedExerciseId: 'performed-1', setNumber: 1,
    completedAt: time, weightKg: 60, reps: 8, durationSeconds: null, distanceMeters: null })
  return plansFromBackup(await buildFullDataBackup())
}

function changed(plans: AccountPlans, name = 'AI Upper') {
  const result = structuredClone(plans)
  result.plans[0].name = name
  result.plans[0].exercises[0].targetSets = 5
  return result
}

beforeEach(async () => {
  await db.open()
  for (const table of db.tables) await table.clear()
  vi.clearAllMocks()
  vi.mocked(uploadAccountData).mockResolvedValue({ version: 1, syncedAt: time })
})

describe('manual account sync', () => {
  it('chooses plans by content, including deletions and unknown baselines', async () => {
    const base = await seed()
    expect(chooseAccountPlans(base, changed(base), base)).toBe('cloud')
    expect(chooseAccountPlans(changed(base, 'Local'), base, base)).toBe('local')
    expect(chooseAccountPlans(changed(base, 'Local'), changed(base), base)).toBe('conflict')
    expect(chooseAccountPlans(base, changed(base), null)).toBe('conflict')
    expect(chooseAccountPlans(base, { plans: [], cycle: null }, base)).toBe('cloud')
    expect(planSignature(base)).toBe(planSignature({ ...base, plans: base.plans.map((p) => ({ ...p, updatedAt: 'other-time' })) }))
  })

  it('uploads a consistent backup without credentials and preserves training history', async () => {
    const base = await seed()
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 0, syncedAt: null, baseline: null, plans: null, pending: false })
    await syncAccount(session)
    const uploaded = vi.mocked(uploadAccountData).mock.calls[0][1]
    expect(JSON.stringify(uploaded.backup)).not.toContain(session.token)
    expect(uploaded.backup.tables.setRecords).toHaveLength(1)
    expect(await db.setRecords.get('set-1')).toMatchObject({ weightKg: 60, reps: 8 })
    expect((await db.accountSync.get(session.user.id))?.baseline).toEqual(base)
    expect(uploaded.backup.tables).not.toHaveProperty('accountSync')
  })

  it('skips uploads when business data is unchanged, including export time and object key order', async () => {
    const base = await seed()
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 0, syncedAt: null, baseline: null, plans: null, pending: false, snapshotVersion: null })
    await syncAccount(session)
    const set = (await db.setRecords.get('set-1'))!
    await db.setRecords.put({ reps: set.reps, ...set })
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 1, syncedAt: time, baseline: base, plans: base, pending: false, snapshotVersion: 1 })
    expect(await syncAccount(session)).toEqual({ syncedAt: time, uploaded: false })
    expect(uploadAccountData).toHaveBeenCalledTimes(1)
    expect(fetchAccountData).not.toHaveBeenCalled()
    expect((await db.accountSync.get(session.user.id))?.pending).toBeNull()
  })

  it('uploads only changed records and explicit deletions, using shared-plan codes as keys', async () => {
    const base = await seed()
    await db.sharedPlanRecords.put({ code: 'shared-1', url: 'https://example.test', title: 'Shared', createdAt: time, expiresAt: null })
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 0, syncedAt: null, baseline: null, plans: null, pending: false })
    await syncAccount(session)
    const set = (await db.setRecords.get('set-1'))!
    await db.setRecords.delete('set-1')
    await db.setRecords.put({ ...set, id: 'set-2', weightKg: 70 })
    await db.sharedPlanRecords.delete('shared-1')
    await db.workoutPlans.update('plan-1', { name: 'Lower' })
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 1, syncedAt: time, baseline: base, plans: base, pending: false, snapshotVersion: 1 })
    vi.mocked(uploadAccountData).mockResolvedValue({ version: 2, syncedAt: time })
    await syncAccount(session)
    const delta = vi.mocked(uploadAccountData).mock.calls[1][1].delta!
    expect(delta.baseSnapshotVersion).toBe(1)
    expect(delta.changes.tables.setRecords).toEqual({ upserts: [{ ...set, id: 'set-2', weightKg: 70 }], deletes: ['set-1'] })
    expect(delta.changes.tables.sharedPlanRecords).toEqual({ upserts: [], deletes: ['shared-1'] })
    expect(delta.changes.tables.workoutPlans?.upserts).toMatchObject([{ id: 'plan-1', name: 'Lower' }])
    expect(delta.changes.tables).not.toHaveProperty('planExercises')
    expect(delta.changes).not.toHaveProperty('localStorage')
    expect(fetchAccountData).not.toHaveBeenCalled()
  })

  it('captures settings changes and removals without uploading training history', async () => {
    const base = await seed()
    const storage = new Map([['trainre.themePreference', 'dark']])
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => storage.get(key) ?? null }, dispatchEvent: vi.fn() })
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 0, syncedAt: null, baseline: null, plans: null, pending: false })
    await syncAccount(session)
    storage.clear()
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 1, syncedAt: time, baseline: base, plans: base, pending: false, snapshotVersion: 1 })
    await syncAccount(session)
    expect(vi.mocked(uploadAccountData).mock.calls[1][1].delta?.changes).toMatchObject({ tables: {}, localStorage: {} })
  })

  it('falls back to a full backup if another device replaced the snapshot or the server has no delta support', async () => {
    const base = await seed()
    const snapshot = await describeAccountSnapshot(await buildFullDataBackup(), 1)
    await db.accountSync.put({ id: session.user.id, baseline: base, syncedAt: time, pending: null, snapshot })
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 2, syncedAt: time, baseline: base, plans: base, pending: false, snapshotVersion: 2 })
    await syncAccount(session)
    expect(vi.mocked(uploadAccountData).mock.calls[0][1].delta).toBeUndefined()
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 3, syncedAt: time, baseline: base, plans: base, pending: false })
    await syncAccount(session)
    expect(vi.mocked(uploadAccountData).mock.calls[1][1].delta).toBeUndefined()
  })

  it('takes AI plans while keeping IDs, cycle anchors and historical records', async () => {
    const base = await seed()
    const remote = changed(base)
    remote.cycle = { id: 'default', slots: [{ id: 'slot-1', planId: 'plan-1' }], anchorIndex: 0, anchorDateKey: '2026-10-20', updatedAt: time }
    await db.accountSync.put({ id: session.user.id, baseline: base, syncedAt: time, pending: null })
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 2, syncedAt: time, baseline: base, plans: remote, pending: true })
    await syncAccount(session)
    expect(await db.workoutPlans.get('plan-1')).toMatchObject({ name: 'AI Upper' })
    expect(await db.planExercises.get('exercise-1')).toMatchObject({ targetSets: 5 })
    expect(await db.trainingCycles.get('default')).toMatchObject({ anchorDateKey: '2026-10-20', slots: [{ id: 'slot-1', planId: 'plan-1' }] })
    expect(await db.setRecords.get('set-1')).toMatchObject({ weightKg: 60, reps: 8 })
  })

  it('uses the unchanged snapshot base after AI edits and does not resend history or churn plan timestamps', async () => {
    const base = await seed()
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 0, syncedAt: null, baseline: null, plans: null, pending: false })
    await syncAccount(session)
    const remote = changed(base)
    remote.plans[0].updatedAt = '2026-10-25T01:00:00.000Z'
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 2, syncedAt: time, baseline: base, plans: remote, pending: true, snapshotVersion: 1 })
    vi.mocked(uploadAccountData).mockResolvedValue({ version: 3, syncedAt: time })
    await syncAccount(session)
    const pending = vi.mocked(uploadAccountData).mock.calls[1][1]
    expect(pending.version).toBe(2)
    expect(pending.delta?.baseSnapshotVersion).toBe(1)
    expect(pending.delta?.changes.tables).not.toHaveProperty('setRecords')
    expect((await db.workoutPlans.get('plan-1'))?.updatedAt).toBe(remote.plans[0].updatedAt)
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 3, syncedAt: time, baseline: remote, plans: remote, pending: false, snapshotVersion: 3 })
    expect((await syncAccount(session)).uploaded).toBe(false)
    expect(uploadAccountData).toHaveBeenCalledTimes(2)
  })

  it('retries exactly the same delta and leaves newer history for the following sync', async () => {
    const base = await seed()
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 0, syncedAt: null, baseline: null, plans: null, pending: false })
    await syncAccount(session)
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 1, syncedAt: time, baseline: base, plans: base, pending: false, snapshotVersion: 1 })
    await db.setRecords.update('set-1', { weightKg: 70 })
    vi.mocked(uploadAccountData).mockRejectedValueOnce(new AccountApiError('NETWORK'))
    await expect(syncAccount(session)).rejects.toThrow('NETWORK')
    const original = structuredClone((await db.accountSync.get(session.user.id))!.pending!)
    await db.setRecords.update('set-1', { weightKg: 80 })
    vi.mocked(uploadAccountData).mockResolvedValue({ version: 2, syncedAt: time })
    await syncAccount(session)
    expect(vi.mocked(uploadAccountData).mock.calls[2][1]).toEqual(original)
    expect((await db.setRecords.get('set-1'))?.weightKg).toBe(80)
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 2, syncedAt: time, baseline: base, plans: base, pending: false, snapshotVersion: 2 })
    await syncAccount(session)
    expect(vi.mocked(uploadAccountData).mock.calls[3][1].delta?.changes.tables.setRecords?.upserts).toMatchObject([{ weightKg: 80 }])
  })

  it('clears a rejected delta without applying cloud plans and rebuilds from the next cloud version', async () => {
    const base = await seed()
    const snapshot = await describeAccountSnapshot(backupWithPlans(await buildFullDataBackup(), base), 1)
    await db.accountSync.put({ id: session.user.id, baseline: base, syncedAt: time, pending: null, snapshot })
    await db.setRecords.update('set-1', { weightKg: 70 })
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 1, syncedAt: time, baseline: base, plans: base, pending: false, snapshotVersion: 1 })
    vi.mocked(uploadAccountData).mockRejectedValueOnce(new AccountApiError('VERSION_CONFLICT'))
    await expect(syncAccount(session)).rejects.toThrow('VERSION_CONFLICT')
    expect((await db.accountSync.get(session.user.id))?.pending).toBeNull()
    expect((await db.setRecords.get('set-1'))?.weightKg).toBe(70)
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 2, syncedAt: time, baseline: base, plans: base, pending: false, snapshotVersion: 2 })
    await syncAccount(session)
    expect(vi.mocked(uploadAccountData).mock.calls[1][1].delta).toBeUndefined()
  })

  it('does not upload or modify either side when plans conflict', async () => {
    const base = await seed()
    await db.workoutPlans.update('plan-1', { name: 'Local Upper' })
    await db.accountSync.put({ id: session.user.id, baseline: base, syncedAt: time, pending: null })
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 2, syncedAt: time, baseline: base, plans: changed(base), pending: true })
    await expect(syncAccount(session)).rejects.toBeInstanceOf(AccountPlanConflict)
    expect(uploadAccountData).not.toHaveBeenCalled()
    expect((await db.workoutPlans.get('plan-1'))?.name).toBe('Local Upper')
  })

  it('retries the same operation after a lost response without creating duplicate plans', async () => {
    await seed()
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 0, syncedAt: null, baseline: null, plans: null, pending: false })
    vi.mocked(uploadAccountData).mockRejectedValueOnce(new AccountApiError('NETWORK'))
    await expect(syncAccount(session)).rejects.toThrow('NETWORK')
    const pending = (await db.accountSync.get(session.user.id))!.pending!
    await syncAccount(session)
    expect(vi.mocked(uploadAccountData).mock.calls[1][1].operationId).toBe(pending.operationId)
    expect(fetchAccountPlans).toHaveBeenCalledTimes(1)
    expect(await db.workoutPlans.count()).toBe(1)
    expect((await db.accountSync.get(session.user.id))?.pending).toBeNull()
  })

  it('protects local edits made while an upload is in progress', async () => {
    const base = await seed()
    await db.accountSync.put({ id: session.user.id, baseline: base, syncedAt: time, pending: null })
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 2, syncedAt: time, baseline: base, plans: changed(base), pending: true })
    vi.mocked(uploadAccountData).mockImplementationOnce(async () => {
      await db.workoutPlans.update('plan-1', { name: 'Edited during upload' })
      return { version: 3, syncedAt: time }
    })
    await expect(syncAccount(session)).rejects.toThrow('LOCAL_CHANGED')
    expect((await db.workoutPlans.get('plan-1'))?.name).toBe('Edited during upload')
  })

  it('resets sync baselines when restoring a full backup', async () => {
    const base = await seed()
    await db.accountSync.put({ id: session.user.id, baseline: base, syncedAt: time, pending: null })
    const backup = await buildFullDataBackup()
    await restoreFullDataBackup(backupWithPlans(backup, changed(base)))
    expect(await db.accountSync.count()).toBe(0)
    expect((await db.workoutPlans.get('plan-1'))?.name).toBe('AI Upper')
    expect(await db.setRecords.count()).toBe(1)
  })

  it('restores cloud history and latest AI plans without uploading or losing the new baseline', async () => {
    const base = await seed()
    const cloudBackup = await buildFullDataBackup()
    const aiPlans = changed(base)
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 2, syncedAt: time, baseline: base, plans: aiPlans, pending: true })
    vi.mocked(fetchAccountData).mockResolvedValue({ version: 2, syncedAt: time, backup: cloudBackup })
    await db.setRecords.update('set-1', { weightKg: 999 })
    await db.setRecords.put({ ...(await db.setRecords.get('set-1'))!, id: 'local-only' })
    const preview = await prepareAccountRestore(session)
    expect(await db.setRecords.count()).toBe(2)
    expect((await db.setRecords.get('set-1'))?.weightKg).toBe(999)
    await restoreAccountData(session, preview)
    expect(await db.setRecords.count()).toBe(1)
    expect((await db.setRecords.get('set-1'))?.weightKg).toBe(60)
    expect((await db.workoutPlans.get('plan-1'))?.name).toBe('AI Upper')
    expect((await db.accountSync.get(session.user.id))).toMatchObject({ baseline: aiPlans, pending: null, syncedAt: time })
    expect(uploadAccountData).not.toHaveBeenCalled()
    await syncAccount(session)
    expect(vi.mocked(uploadAccountData).mock.calls[0][1].backup.tables.setRecords).toEqual(cloudBackup.tables.setRecords)
  })

  it('restores onto an empty device while preserving its account session and replacing runtime settings', async () => {
    const base = await seed()
    const backup = await buildFullDataBackup()
    backup.localStorage = { 'trainre.accountSession.v1': 'never-import-this', 'trainre.themePreference': 'dark' }
    for (const table of db.tables) await table.clear()
    const storage = new Map([['trainre.accountSession.v1', JSON.stringify(session)], ['trainre.current-session-id.v1', 'old-session']])
    vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    }, dispatchEvent: vi.fn() })
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 1, syncedAt: time, baseline: base, plans: base, pending: false })
    vi.mocked(fetchAccountData).mockResolvedValue({ version: 1, syncedAt: time, backup })
    await restoreAccountData(session, await prepareAccountRestore(session))
    expect(await db.setRecords.count()).toBe(1)
    expect(await db.workoutPlans.count()).toBe(1)
    expect(storage.get('trainre.accountSession.v1')).toBe(JSON.stringify(session))
    expect(storage.get('trainre.themePreference')).toBe('dark')
    expect(storage.has('trainre.current-session-id.v1')).toBe(false)
    expect(uploadAccountData).not.toHaveBeenCalled()
  })

  it('establishes the restored snapshot baseline and skips a redundant upload', async () => {
    const base = await seed()
    const backup = backupWithPlans(await buildFullDataBackup(), base)
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 1, syncedAt: time, baseline: base, plans: base, pending: false, snapshotVersion: 1 })
    vi.mocked(fetchAccountData).mockResolvedValue({ version: 1, snapshotVersion: 1, syncedAt: time, backup })
    await db.setRecords.update('set-1', { weightKg: 999 })
    await restoreAccountData(session, await prepareAccountRestore(session))
    expect((await db.accountSync.get(session.user.id))?.snapshot?.version).toBe(1)
    expect(await syncAccount(session)).toEqual({ syncedAt: time, uploaded: false })
    expect(uploadAccountData).not.toHaveBeenCalled()
  })

  it('rejects stale or cross-account restore previews without modifying local data', async () => {
    const base = await seed()
    const backup = await buildFullDataBackup()
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 3, syncedAt: time, baseline: base, plans: base, pending: false })
    const preview = { userId: session.user.id, version: 2, syncedAt: time, backup }
    await expect(restoreAccountData(session, preview)).rejects.toThrow('VERSION_CONFLICT')
    await expect(restoreAccountData(session, { ...preview, userId: 'other' })).rejects.toThrow('UNAUTHORIZED')
    expect(await db.setRecords.count()).toBe(1)
    expect(await db.accountSync.count()).toBe(0)
  })

  it('keeps local data when cloud data is absent or cannot be downloaded', async () => {
    const base = await seed()
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 0, syncedAt: null, baseline: null, plans: null, pending: false })
    vi.mocked(fetchAccountData).mockRejectedValueOnce(new AccountApiError('NO_DATA'))
    await expect(prepareAccountRestore(session)).rejects.toThrow('NO_DATA')
    expect(planSignature(plansFromBackup(await buildFullDataBackup()))).toBe(planSignature(base))
    expect(await db.setRecords.count()).toBe(1)
  })

  it('rolls back the entire restore including old sync metadata if any table fails to import', async () => {
    const base = await seed()
    await db.accountSync.put({ id: session.user.id, baseline: base, syncedAt: time, pending: null })
    const backup = backupWithPlans(await buildFullDataBackup(), changed(base))
    backup.tables.setRecords = [{ weightKg: 999 }]
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 2, syncedAt: time, baseline: base, plans: base, pending: false })
    await expect(restoreAccountData(session, { userId: session.user.id, version: 2, syncedAt: time, backup })).rejects.toThrow()
    expect((await db.workoutPlans.get('plan-1'))?.name).toBe('Upper')
    expect((await db.setRecords.get('set-1'))?.weightKg).toBe(60)
    expect((await db.accountSync.get(session.user.id))?.baseline).toEqual(base)
  })

  it('upgrades existing local data without replacing it', async () => {
    await db.delete()
    const old = new Dexie('trainre')
    old.version(18).stores({ workoutPlans: 'id, name, updatedAt' })
    await old.table('workoutPlans').put({ id: 'legacy', name: 'Existing plan', createdAt: time, updatedAt: time })
    old.close()
    await db.open()
    expect((await db.workoutPlans.get('legacy'))?.name).toBe('Existing plan')
    expect(db.verno).toBe(21)
    expect(await db.accountSync.count()).toBe(0)
  })

  it('preserves a version 19 pending upload during migration and establishes a snapshot after its retry', async () => {
    const base = await seed()
    vi.mocked(fetchAccountPlans).mockResolvedValue({ version: 0, syncedAt: null, baseline: null, plans: null, pending: false })
    vi.mocked(uploadAccountData).mockRejectedValueOnce(new AccountApiError('NETWORK'))
    await expect(syncAccount(session)).rejects.toThrow('NETWORK')
    const pending = (await db.accountSync.get(session.user.id))!.pending!
    await db.delete()
    const old = new Dexie('trainre')
    old.version(19).stores({ workoutPlans: 'id, name, updatedAt', planExercises: 'id, planId, [planId+order]', accountSync: 'id' })
    await old.table('workoutPlans').bulkPut(pending.backup.tables.workoutPlans)
    await old.table('planExercises').bulkPut(pending.backup.tables.planExercises)
    await old.table('accountSync').put({ id: session.user.id, baseline: base, syncedAt: time, pending })
    old.close()
    await db.open()
    expect((await db.accountSync.get(session.user.id))?.pending).toEqual(pending)
    expect((await db.accountSync.get(session.user.id))?.snapshot).toBeNull()
    await syncAccount(session)
    expect((await db.accountSync.get(session.user.id))?.snapshot?.version).toBe(1)
  })
})
