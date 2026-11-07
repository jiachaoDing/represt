import { loadModes, type ExerciseMetadata } from './metadata'
import generated from './generated.json'

export function parseExerciseMetadata(input: Record<string, unknown>): ExerciseMetadata {
  const result: ExerciseMetadata = {}
  const stringList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length <= 4000).slice(0, 100) : []
  if (loadModes.includes(input.loadMode as never)) result.loadMode = input.loadMode as ExerciseMetadata['loadMode']
  else if (Object.hasOwn(input, 'loadMode') && input.loadMode == null) result.loadMode = undefined
  if (input.mechanic === 'compound' || input.mechanic === 'isolation') result.mechanic = input.mechanic
  else if (Object.hasOwn(input, 'mechanic') && input.mechanic == null) result.mechanic = null
  if (['bilateral', 'unilateral', 'alternating'].includes(String(input.laterality))) result.laterality = input.laterality as ExerciseMetadata['laterality']
  else if (Object.hasOwn(input, 'laterality') && input.laterality == null) result.laterality = null
  if (typeof input.primaryEquipment === 'string' && Object.hasOwn(generated.equipmentNames, input.primaryEquipment)) result.primaryEquipment = input.primaryEquipment
  else if (input.primaryEquipment === null) result.primaryEquipment = null
  if (input.setup !== undefined) result.setup = stringList(input.setup).filter((id) => Object.hasOwn(generated.equipmentNames, id))
  if (Array.isArray(input.muscles)) result.muscles = input.muscles.flatMap((value) => {
    if (!value || typeof value !== 'object') return []
    const item = value as Record<string, unknown>
    return generated.muscles.some((node) => node.id === item.id) && (item.role === 'primary' || item.role === 'secondary') ? [{ id: item.id as string, role: item.role }] : []
  })
  if (input.trainingDefaults && typeof input.trainingDefaults === 'object') {
    const value = input.trainingDefaults as Record<string, unknown>
    const defaults: NonNullable<ExerciseMetadata['trainingDefaults']> = {}
    for (const field of ['targetSets', 'restSeconds', 'weightIncrementKg'] as const) {
      const number = value[field]
      if (number === null && field === 'weightIncrementKg') defaults[field] = null
      else if (typeof number === 'number' && Number.isFinite(number) && number >= (field === 'targetSets' ? 1 : 0) && (field === 'weightIncrementKg' || Number.isInteger(number))) defaults[field] = number
    }
    if (value.repsRange === null) defaults.repsRange = null
    else if (value.repsRange && typeof value.repsRange === 'object') {
      const { min, max } = value.repsRange as Record<string, unknown>
      if (typeof min === 'number' && typeof max === 'number' && Number.isInteger(min) && Number.isInteger(max) && min > 0 && max >= min) defaults.repsRange = { min, max }
    }
    result.trainingDefaults = defaults
  }
  if (Array.isArray(input.provenance)) result.provenance = input.provenance.flatMap((value) => {
    if (!value || typeof value !== 'object') return []
    const item = value as Record<string, unknown>
    return ['source', 'sourceId', 'version', 'license', 'author', 'url'].every((key) => typeof item[key] === 'string') && /^https:\/\//.test(String(item.url))
      ? [{ source: String(item.source), sourceId: String(item.sourceId), version: String(item.version), license: String(item.license), author: String(item.author), url: String(item.url), modified: item.modified === true }] : []
  })
  return result
}
