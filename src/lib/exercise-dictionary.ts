import type { TFunction } from 'i18next'

import { equipment, exercises, muscles } from '../domain/exercise-catalog'
import {
  getEquipmentAliases,
  getEquipmentName,
  getExerciseAliases,
  getExerciseName,
  getMuscleAliases,
  getMuscleName,
} from './exercise-catalog-i18n'

export type ExerciseDictionaryEntry = {
  id: string
  aliases: string[]
}

export type ExerciseNameSuggestion = {
  id: string
  name: string
}

const pinyinAliasesByExerciseId: Record<string, string[]> = {
  barbellBenchPress: ['bbwp', 'wt'],
  dumbbellBenchPress: ['ylwt', 'wt'],
  inclineBarbellBenchPress: ['sxwt'],
  inclineDumbbellBenchPress: ['sxylwt'],
  declineBarbellBenchPress: ['xxglwt'],
  declineDumbbellBenchPress: ['xxylwt'],
  pecDeck: ['qxjx'],
  cableFly: ['ssjx'],
  dip: ['sgbqs'],
  pushUp: ['fwc'],
  weightedPushUp: ['fzfwc'],
  pullUp: ['ytxs'],
  wideGripPullUp: ['gwytxs'],
  chinUp: ['fshytxs'],
  latPulldown: ['gwxl'],
  closeGripLatPulldown: ['zwgwxl'],
  barbellRow: ['glhc'],
  seatedRow: ['zzhc'],
  singleArmDumbbellRow: ['dbylhc'],
  tBarRow: ['tghc'],
  straightArmPulldown: ['zbxy'],
  deadlift: ['yl'],
  romanianDeadlift: ['lmnyyl'],
  sumoDeadlift: ['xpyl'],
  legPress: ['tt'],
  squat: ['sd'],
  barbellSquat: ['glsd'],
  frontSquat: ['qd'],
  legPressMachine: ['tj'],
  hackSquat: ['hksd'],
  gluteBridge: ['tq'],
  barbellHipThrust: ['gltt'],
  lunge: ['jbd'],
  bulgarianSplitSquat: ['bjlyftd'],
  walkingLunge: ['xzgbd'],
  legCurl: ['twj'],
  legExtension: ['tqs'],
  standingCalfRaise: ['zztz'],
  seatedCalfRaise: ['zztz'],
  hipAbduction: ['kwz'],
  hipAdduction: ['kns'],
  barbellOverheadPress: ['gltj'],
  dumbbellShoulderPress: ['yltj'],
  arnoldPress: ['andtj'],
  dumbbellLateralRaise: ['ylcpj'],
  dumbbellFrontRaise: ['ylqpj'],
  facePull: ['ml'],
  reverseFly: ['fxfn'],
  shrug: ['sj'],
  barbellCurl: ['glwj'],
  dumbbellCurl: ['ylwj'],
  hammerCurl: ['cswj'],
  preacherCurl: ['msdwj'],
  concentrationCurl: ['jzwj'],
  tricepsPushdown: ['ssxy'],
  closeGripBenchPress: ['zjwt'],
  overheadTricepsExtension: ['jhbqs'],
  skullCrusher: ['ywbqs'],
  tricepsRopeExtension: ['ssbqs'],
  crunch: ['jf'],
  plank: ['pbzc'],
  hangingLegRaise: ['xcjt'],
  russianTwist: ['elszt'],
  sitUp: ['ywqz'],
  cableCrunch: ['ssjf'],
  deadBug: ['sc'],
  birdDog: ['ng'],
}

export const exerciseDictionary: ExerciseDictionaryEntry[] = exercises.map((exercise) => ({
  id: exercise.id,
  aliases: [...exercise.aliases, ...(pinyinAliasesByExerciseId[exercise.id] ?? [])],
}))

const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]))
const equipmentById = new Map(equipment.map((item) => [item.id, item]))
const musclesById = new Map(muscles.map((muscle) => [muscle.id, muscle]))

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

function getAssociatedCatalogSearchValues(t: TFunction, exerciseId: string) {
  const exercise = exercisesById.get(exerciseId)

  if (!exercise) {
    return []
  }

  const equipmentSearchValues = exercise.equipmentIds.flatMap((equipmentId) => {
    const item = equipmentById.get(equipmentId)
    return [
      getEquipmentName(t, equipmentId),
      ...getEquipmentAliases(t, equipmentId),
      ...(item?.aliases ?? []),
    ]
  })

  const muscleSearchValues = [...exercise.primaryMuscleIds, ...exercise.secondaryMuscleIds].flatMap((muscleId) => {
    const muscle = musclesById.get(muscleId)
    return [
      getMuscleName(t, muscleId),
      ...getMuscleAliases(t, muscleId),
      ...(muscle?.aliases ?? []),
    ]
  })

  return [...equipmentSearchValues, ...muscleSearchValues]
}

export function findExerciseNameSuggestions(
  keyword: string,
  t: TFunction,
  limit = 8,
): ExerciseNameSuggestion[] {
  const normalizedKeyword = normalizeKeyword(keyword)

  return exerciseDictionary
    .map((entry) => {
      const name = getExerciseName(t, entry.id)
      const searchableValues = [
        name,
        ...getExerciseAliases(t, entry.id),
        ...entry.aliases,
        ...getAssociatedCatalogSearchValues(t, entry.id),
      ]
      return { entry, name, searchableValues }
    })
    .filter(({ searchableValues }) => {
      if (!normalizedKeyword) {
        return true
      }

      return searchableValues.some((value) => normalizeKeyword(value).includes(normalizedKeyword))
    })
    .slice(0, limit)
    .map(({ entry, name }) => ({ id: entry.id, name }))
}
