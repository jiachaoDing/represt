import snapshot from './legacy-v21.json'
import type { MeasurementType } from './types'

export const legacyCatalog = snapshot.catalog
const legacyIds = new Set(legacyCatalog.map((exercise) => exercise.id))
export function normalizeExerciseName(name: string) {
  return name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
}
export function resolveLegacyCatalogId(input: { catalogExerciseId?: string | null; name?: string | null }) {
  const id = input.catalogExerciseId?.trim()
  return id && legacyIds.has(id) ? id : (snapshot.names as Record<string, string>)[normalizeExerciseName(input.name ?? '')] ?? null
}
export function legacyProfileId(input: { catalogExerciseId?: string | null; name?: string | null; id?: string }) {
  const id = resolveLegacyCatalogId(input)
  const name = normalizeExerciseName(input.name ?? '')
  return id ? `catalog:${id}` : name ? `name:${name}` : `exercise:${input.id ?? 'unknown'}`
}
export function legacyMeasurement(input: { catalogExerciseId?: string | null; name?: string | null; measurementType?: MeasurementType | null }) {
  return input.measurementType ?? legacyCatalog.find((exercise) => exercise.id === resolveLegacyCatalogId(input))?.measurementType as MeasurementType ?? 'weightReps'
}
