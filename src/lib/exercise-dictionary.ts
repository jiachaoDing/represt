import type { TFunction } from 'i18next'

export type ExerciseDictionaryEntry = {
  id: string
  aliases?: string[]
}

export type ExerciseNameSuggestion = {
  id: string
  name: string
}

export const exerciseDictionary: ExerciseDictionaryEntry[] = [
  { id: 'barbellBenchPress', aliases: ['bbwp', 'wt'] },
  { id: 'dumbbellBenchPress', aliases: ['ylwt', 'wt'] },
  { id: 'inclineBarbellBenchPress', aliases: ['sxwt'] },
  { id: 'inclineDumbbellBenchPress', aliases: ['sxylwt'] },
  { id: 'declineBarbellBenchPress', aliases: ['xxglwt'] },
  { id: 'declineDumbbellBenchPress', aliases: ['xxylwt'] },
  { id: 'pecDeck', aliases: ['qxjx'] },
  { id: 'cableFly', aliases: ['ssjx'] },
  { id: 'dip', aliases: ['sgbqs'] },
  { id: 'pushUp', aliases: ['fwc'] },
  { id: 'weightedPushUp', aliases: ['fzfwc'] },
  { id: 'pullUp', aliases: ['ytxs'] },
  { id: 'wideGripPullUp', aliases: ['gwytxs'] },
  { id: 'chinUp', aliases: ['fshytxs'] },
  { id: 'latPulldown', aliases: ['gwxl'] },
  { id: 'closeGripLatPulldown', aliases: ['zwgwxl'] },
  { id: 'barbellRow', aliases: ['glhc'] },
  { id: 'seatedRow', aliases: ['zzhc'] },
  { id: 'singleArmDumbbellRow', aliases: ['dbylhc'] },
  { id: 'tBarRow', aliases: ['tghc'] },
  { id: 'straightArmPulldown', aliases: ['zbxy'] },
  { id: 'deadlift', aliases: ['yl'] },
  { id: 'romanianDeadlift', aliases: ['lmnyyl'] },
  { id: 'sumoDeadlift', aliases: ['xpyl'] },
  { id: 'legPress', aliases: ['tt'] },
  { id: 'squat', aliases: ['sd'] },
  { id: 'barbellSquat', aliases: ['glsd'] },
  { id: 'frontSquat', aliases: ['qd'] },
  { id: 'legPressMachine', aliases: ['tj'] },
  { id: 'hackSquat', aliases: ['hksd'] },
  { id: 'gluteBridge', aliases: ['tq'] },
  { id: 'barbellHipThrust', aliases: ['gltt'] },
  { id: 'lunge', aliases: ['jbd'] },
  { id: 'bulgarianSplitSquat', aliases: ['bjlyftd'] },
  { id: 'walkingLunge', aliases: ['xzgbd'] },
  { id: 'legCurl', aliases: ['twj'] },
  { id: 'legExtension', aliases: ['tqs'] },
  { id: 'standingCalfRaise', aliases: ['zztz'] },
  { id: 'seatedCalfRaise', aliases: ['zztz'] },
  { id: 'hipAbduction', aliases: ['kwz'] },
  { id: 'hipAdduction', aliases: ['kns'] },
  { id: 'barbellOverheadPress', aliases: ['gltj'] },
  { id: 'dumbbellShoulderPress', aliases: ['yltj'] },
  { id: 'arnoldPress', aliases: ['andtj'] },
  { id: 'dumbbellLateralRaise', aliases: ['ylcpj'] },
  { id: 'dumbbellFrontRaise', aliases: ['ylqpj'] },
  { id: 'facePull', aliases: ['ml'] },
  { id: 'reverseFly', aliases: ['fxfn'] },
  { id: 'shrug', aliases: ['sj'] },
  { id: 'barbellCurl', aliases: ['glwj'] },
  { id: 'dumbbellCurl', aliases: ['ylwj'] },
  { id: 'hammerCurl', aliases: ['cswj'] },
  { id: 'preacherCurl', aliases: ['msdwj'] },
  { id: 'concentrationCurl', aliases: ['jzwj'] },
  { id: 'tricepsPushdown', aliases: ['ssxy'] },
  { id: 'closeGripBenchPress', aliases: ['zjwt'] },
  { id: 'overheadTricepsExtension', aliases: ['jhbqs'] },
  { id: 'skullCrusher', aliases: ['ywbqs'] },
  { id: 'tricepsRopeExtension', aliases: ['ssbqs'] },
  { id: 'crunch', aliases: ['jf'] },
  { id: 'plank', aliases: ['pbzc'] },
  { id: 'hangingLegRaise', aliases: ['xcjt'] },
  { id: 'russianTwist', aliases: ['elszt'] },
  { id: 'sitUp', aliases: ['ywqz'] },
  { id: 'cableCrunch', aliases: ['ssjf'] },
  { id: 'deadBug', aliases: ['sc'] },
  { id: 'birdDog', aliases: ['ng'] },
]

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

function getLocalizedAliases(t: TFunction<'exercises'>, id: string) {
  const aliases = t(`aliases.${id}`, { returnObjects: true, defaultValue: [] })
  return Array.isArray(aliases) ? aliases.filter((alias): alias is string => typeof alias === 'string') : []
}

function getLocalizedName(t: TFunction<'exercises'>, id: string) {
  return t(`names.${id}`, { defaultValue: id })
}

export function findExerciseNameSuggestions(
  keyword: string,
  t: TFunction<'exercises'>,
  limit = 8,
): ExerciseNameSuggestion[] {
  const normalizedKeyword = normalizeKeyword(keyword)

  return exerciseDictionary
    .map((entry) => {
      const name = getLocalizedName(t, entry.id)
      const searchableValues = [name, ...getLocalizedAliases(t, entry.id), ...(entry.aliases ?? [])]
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
