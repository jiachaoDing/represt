import type { TFunction } from 'i18next'

import type { Equipment, Exercise, Muscle, MuscleGroup } from '../domain/exercise-catalog'

function getLocalizedString(t: TFunction, key: string, fallback: string) {
  const value = t(key, { defaultValue: fallback })
  return typeof value === 'string' ? value : fallback
}

function getLocalizedStringArray(t: TFunction, key: string) {
  const value = t(key, { returnObjects: true, defaultValue: [] })
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function getExerciseName(t: TFunction, id: Exercise['id']) {
  return getLocalizedString(t, `exercises:names.${id}`, id)
}

export function getExerciseAliases(t: TFunction, id: Exercise['id']) {
  return getLocalizedStringArray(t, `exercises:aliases.${id}`)
}

export function getEquipmentName(t: TFunction, id: Equipment['id']) {
  return getLocalizedString(t, `equipment:names.${id}`, id)
}

export function getEquipmentAliases(t: TFunction, id: Equipment['id']) {
  return getLocalizedStringArray(t, `equipment:aliases.${id}`)
}

export function getMuscleName(t: TFunction, id: Muscle['id']) {
  return getLocalizedString(t, `muscles:names.${id}`, id)
}

export function getMuscleAliases(t: TFunction, id: Muscle['id']) {
  return getLocalizedStringArray(t, `muscles:aliases.${id}`)
}

export function getMuscleGroupName(t: TFunction, groupId: MuscleGroup) {
  return getLocalizedString(t, `muscles:groups.${groupId}`, groupId)
}
