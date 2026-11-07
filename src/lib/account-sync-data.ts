import { backupTableNames, type FullDataBackup } from './full-data-backup'

type TableName = (typeof backupTableNames)[number]
export type AccountDataDelta = {
  schemaVersion: 1
  exportedAt: string
  tables: Partial<Record<TableName, { upserts: unknown[]; deletes: string[] }>>
  localStorage?: Record<string, string>
}
export type AccountSnapshot = {
  version: number
  tables: Record<TableName, Record<string, string>>
  localStorage: string
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonical(entry)]))
  }
  return value
}

async function digest(value: unknown) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(canonical(value))))
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function rowKey(name: TableName, value: unknown) {
  const key = (value as Record<string, unknown>)[name === 'sharedPlanRecords' ? 'code' : 'id']
  if (typeof key !== 'string' || !key) throw new Error('INVALID_BACKUP')
  return key
}

export async function describeAccountSnapshot(backup: FullDataBackup, version: number): Promise<AccountSnapshot> {
  const tables = {} as AccountSnapshot['tables']
  for (const name of backupTableNames) {
    const rows: Array<[string, string]> = []
    // Bound the number of outstanding digest operations for large histories.
    for (let offset = 0; offset < backup.tables[name].length; offset += 256) {
      rows.push(...await Promise.all(backup.tables[name].slice(offset, offset + 256)
        .map(async (value): Promise<[string, string]> => [rowKey(name, value), await digest(value)])))
    }
    tables[name] = Object.fromEntries(rows)
  }
  return { version, tables, localStorage: await digest(backup.localStorage) }
}

export function buildAccountDelta(backup: FullDataBackup, current: AccountSnapshot, baseline: AccountSnapshot) {
  const delta: AccountDataDelta = { schemaVersion: 1, exportedAt: backup.exportedAt, tables: {} }
  for (const name of backupTableNames) {
    const previous = new Map(Object.entries(baseline.tables[name]))
    const next = new Map(Object.entries(current.tables[name]))
    const upserts = backup.tables[name].filter((value) => previous.get(rowKey(name, value)) !== next.get(rowKey(name, value)))
    const deletes = [...previous.keys()].filter((key) => !next.has(key))
    if (upserts.length || deletes.length) delta.tables[name] = { upserts, deletes }
  }
  if (current.localStorage !== baseline.localStorage) delta.localStorage = backup.localStorage
  return delta
}

export function accountDeltaIsEmpty(delta: AccountDataDelta) {
  return Object.keys(delta.tables).length === 0 && delta.localStorage === undefined
}
