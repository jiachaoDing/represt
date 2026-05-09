import { db, type SharedPlanRecord } from './app-db'

export type SharedPlanRecordInput = SharedPlanRecord

export async function addSharedPlanRecord(record: SharedPlanRecordInput) {
  await db.sharedPlanRecords.put(record)
}

export async function listSharedPlanRecords() {
  const records = await db.sharedPlanRecords.toArray()

  return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export async function deleteSharedPlanRecord(code: string) {
  await db.sharedPlanRecords.delete(code)
}
