import type { TFunction } from 'i18next'
import type { ExerciseDefinition } from '../db/exercise-models'
import { getExerciseName, getExerciseAliases, getMovementPatternName, getMuscleGroupName, getDetailedMuscleName } from './exercise-catalog-i18n'
import { findExerciseNameSuggestions } from './exercise-dictionary'
import generated from '../domain/exercise-catalog/generated.json'
import en from '../locales/en/exercises'
import zh from '../locales/zh-CN/exercises'

export const normalizeSearch = (value: string) => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, '')
export const getDefinitionName = (t: TFunction, definition: Pick<ExerciseDefinition, 'name' | 'catalogExerciseId'>) =>
  definition.name.trim() || (definition.catalogExerciseId ? getExerciseName(t, definition.catalogExerciseId) : '')

export function searchExerciseDefinitions(definitions: ExerciseDefinition[], query: string, t: TFunction, filters: { category?: string; equipment?: string; pattern?: string; mechanic?: string } = {}) {
  const keyword = normalizeSearch(query)
  const builtinMatches = new Set(keyword ? findExerciseNameSuggestions(query, t, 10000).map((item) => item.id) : [])
  return definitions.map((definition) => {
    const catalogId = definition.catalogExerciseId
    const name = getDefinitionName(t, definition)
    const values = [name, ...definition.aliases, getMovementPatternName(t, definition.movementPattern),
      definition.categoryId === 'other' ? t('catalog.unclassified') : getMuscleGroupName(t, definition.categoryId),
      ...definition.muscleDistribution.map((item) => getMuscleGroupName(t, item.muscleGroupId)),
      ...generated.muscles.filter((muscle) => definition.muscles?.some((item) => item.id === muscle.id)).flatMap((muscle) => [muscle.name, getDetailedMuscleName(t, muscle.id), muscle.group === 'other' ? '' : getMuscleGroupName(t, muscle.group as ExerciseDefinition['muscleDistribution'][number]['muscleGroupId'])]),
      ...[definition.primaryEquipment, ...definition.setup ?? []].filter(Boolean).map((id) => t(`catalog.equipment.${id}`, { defaultValue: (generated.equipmentNames as Record<string, string>)[id!] ?? id! })),
      ...(catalogId ? [getExerciseName(t, catalogId), ...getExerciseAliases(t, catalogId),
        (en.names as Record<string, string>)[catalogId] ?? '', (zh.names as Record<string, string>)[catalogId] ?? ''] : []),
    ]
    const score = keyword && normalizeSearch(name) === keyword ? 0 : keyword && normalizeSearch(name).startsWith(keyword) ? 1 : 2
    const matches = !keyword || values.some((value) => normalizeSearch(value).includes(keyword)) || Boolean(catalogId && builtinMatches.has(catalogId))
    const categories = new Set([definition.categoryId, ...definition.muscleDistribution.map((item) => item.muscleGroupId)])
    for (const muscle of definition.muscles ?? []) {
      const node = generated.muscles.find((item) => item.id === muscle.id)
      if (node) categories.add(node.group as ExerciseDefinition['categoryId'])
    }
    return { definition, score, matches: matches && (!filters.category || filters.category === 'all' || categories.has(filters.category as ExerciseDefinition['categoryId']))
      && (!filters.equipment || [definition.primaryEquipment, ...definition.setup ?? []].includes(filters.equipment))
      && (!filters.pattern || definition.movementPattern === filters.pattern) && (!filters.mechanic || definition.mechanic === filters.mechanic) }
  }).filter((item) => item.matches).sort((a, b) => a.score - b.score).map((item) => item.definition)
}
