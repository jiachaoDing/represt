import { db } from '../db/app-db'

const BACKUP_APP_ID = 'represt'
const FULL_DATA_BACKUP_SCHEMA_VERSION = 1

const backupTableNames = [
  'trainingCycles',
  'workoutPlans',
  'planExercises',
  'workoutSessions',
  'sessionPlanItems',
  'performedExercises',
  'setRecords',
  'exerciseProfiles',
  'sharedPlanRecords',
] as const

const restorableLocalStorageKeys = [
  'trainre.languagePreference',
  'trainre.themePreference',
  'trainre:haptics-enabled',
  'trainre:timer-reminder-settings-seen',
  'trainre:timer-beep-volume',
  'trainre:repeat-finish-alert-in-background',
  'trainre.quickTimerTipDismissed.v1',
  'trainre.saveTodayAsPlanTipHidden.v1',
  'trainre.saveTodayAsPlanUsed.v1',
] as const

const runtimeLocalStorageKeys = [
  'trainre.current-session-id.v1',
  'trainre.debug-date-offset-days.v1',
  'trainre:exercise-quick-timer',
] as const

type BackupTableName = (typeof backupTableNames)[number]

export type FullDataBackupTables = Record<BackupTableName, unknown[]>

export type FullDataBackup = {
  app: typeof BACKUP_APP_ID
  exportedAt: string
  localStorage: Record<string, string>
  schemaVersion: typeof FULL_DATA_BACKUP_SCHEMA_VERSION
  tables: FullDataBackupTables
}

export type FullDataBackupParseError =
  | 'invalidJson'
  | 'invalidShape'
  | 'missingJson'
  | 'unsupportedVersion'

export type FullDataBackupParseResult =
  | { ok: true; data: FullDataBackup }
  | { ok: false; error: FullDataBackupParseError }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readRestorableLocalStorage() {
  const values: Record<string, string> = {}

  if (typeof window === 'undefined') {
    return values
  }

  for (const key of restorableLocalStorageKeys) {
    const value = window.localStorage.getItem(key)
    if (value !== null) {
      values[key] = value
    }
  }

  return values
}

function applyRestorableLocalStorage(values: Record<string, string>) {
  if (typeof window === 'undefined') {
    return
  }

  for (const key of restorableLocalStorageKeys) {
    const value = values[key]
    try {
      if (value === undefined) {
        window.localStorage.removeItem(key)
        continue
      }

      window.localStorage.setItem(key, value)
    } catch {
      // The restored database data is still valid if a browser refuses storage writes.
    }
  }

  for (const key of runtimeLocalStorageKeys) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Runtime keys will be ignored after the page reloads if storage is unavailable.
    }
  }
}

function getDownloadFileName() {
  return `represt-backup-${new Date().toISOString().slice(0, 10)}.json`
}

export async function buildFullDataBackup(): Promise<FullDataBackup> {
  const tables = {} as FullDataBackupTables

  await Promise.all(
    backupTableNames.map(async (tableName) => {
      tables[tableName] = await db.table(tableName).toArray()
    }),
  )

  return {
    app: BACKUP_APP_ID,
    exportedAt: new Date().toISOString(),
    localStorage: readRestorableLocalStorage(),
    schemaVersion: FULL_DATA_BACKUP_SCHEMA_VERSION,
    tables,
  }
}

export async function downloadFullDataBackup() {
  const backup = await buildFullDataBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = getDownloadFileName()
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function parseFullDataBackupJson(text: string): FullDataBackupParseResult {
  if (!text.trim()) {
    return { ok: false, error: 'missingJson' }
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalidJson' }
  }

  if (!isRecord(parsed) || parsed.app !== BACKUP_APP_ID) {
    return { ok: false, error: 'invalidShape' }
  }

  if (parsed.schemaVersion !== FULL_DATA_BACKUP_SCHEMA_VERSION) {
    return { ok: false, error: 'unsupportedVersion' }
  }

  if (
    typeof parsed.exportedAt !== 'string' ||
    !isRecord(parsed.tables) ||
    !isRecord(parsed.localStorage)
  ) {
    return { ok: false, error: 'invalidShape' }
  }

  const localStorage: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed.localStorage)) {
    if (typeof value !== 'string') {
      return { ok: false, error: 'invalidShape' }
    }
    localStorage[key] = value
  }

  const tables = {} as FullDataBackupTables
  for (const tableName of backupTableNames) {
    const value = parsed.tables[tableName]
    if (!Array.isArray(value)) {
      return { ok: false, error: 'invalidShape' }
    }
    tables[tableName] = value
  }

  return {
    ok: true,
    data: {
      app: BACKUP_APP_ID,
      exportedAt: parsed.exportedAt,
      localStorage,
      schemaVersion: FULL_DATA_BACKUP_SCHEMA_VERSION,
      tables,
    },
  }
}

export async function restoreFullDataBackup(backup: FullDataBackup) {
  const tables = backupTableNames.map((tableName) => db.table(tableName))

  await db.transaction('rw', tables, async () => {
    for (const tableName of backupTableNames) {
      await db.table(tableName).clear()
    }

    for (const tableName of backupTableNames) {
      const records = backup.tables[tableName]
      if (records.length > 0) {
        await db.table(tableName).bulkPut(records)
      }
    }
  })

  applyRestorableLocalStorage(backup.localStorage)
}
