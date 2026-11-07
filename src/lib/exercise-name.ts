import type { TFunction } from 'i18next'

import { exercises } from '../domain/exercise-catalog'
import enExercises from '../locales/en/exercises'
import zhCNExercises from '../locales/zh-CN/exercises'
import { supportedLanguages, type SupportedLanguage } from '../i18n/languages'

type ExerciseNameSource = {
  catalogExerciseId?: string | null
  displayNameOverride?: string | null
  name?: string | null
}

export type ExerciseNameValue = {
  name: string
  catalogExerciseId: string | null
}

const exerciseIds = new Set(exercises.map((exercise) => exercise.id))
// Keep name-only auto-matching stable so new catalog entries do not claim old custom records.
const exactNameMatchedExerciseIds = new Set([
  'barbellBenchPress',
  'dumbbellBenchPress',
  'inclineBarbellBenchPress',
  'inclineDumbbellBenchPress',
  'declineBarbellBenchPress',
  'declineDumbbellBenchPress',
  'pecDeck',
  'cableFly',
  'dip',
  'pushUp',
  'weightedPushUp',
  'pullUp',
  'wideGripPullUp',
  'chinUp',
  'latPulldown',
  'closeGripLatPulldown',
  'barbellRow',
  'seatedRow',
  'singleArmDumbbellRow',
  'tBarRow',
  'straightArmPulldown',
  'deadlift',
  'romanianDeadlift',
  'sumoDeadlift',
  'legPress',
  'squat',
  'barbellSquat',
  'frontSquat',
  'legPressMachine',
  'hackSquat',
  'gluteBridge',
  'barbellHipThrust',
  'lunge',
  'bulgarianSplitSquat',
  'walkingLunge',
  'legCurl',
  'legExtension',
  'standingCalfRaise',
  'seatedCalfRaise',
  'hipAbduction',
  'hipAdduction',
  'barbellOverheadPress',
  'dumbbellShoulderPress',
  'arnoldPress',
  'dumbbellLateralRaise',
  'dumbbellFrontRaise',
  'facePull',
  'reverseFly',
  'shrug',
  'barbellCurl',
  'dumbbellCurl',
  'hammerCurl',
  'preacherCurl',
  'concentrationCurl',
  'tricepsPushdown',
  'closeGripBenchPress',
  'overheadTricepsExtension',
  'skullCrusher',
  'tricepsRopeExtension',
  'crunch',
  'plank',
  'hangingLegRaise',
  'russianTwist',
  'sitUp',
  'cableCrunch',
  'deadBug',
  'birdDog',
])
const primaryNamesByLanguage: Record<SupportedLanguage, Record<string, string>> = {
  'zh-CN': zhCNExercises.names,
  en: enExercises.names,
}

function normalizePrimaryName(value: string) {
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
}

const catalogIdsByNormalizedPrimaryName = new Map<string, Set<string>>()

for (const language of supportedLanguages) {
  for (const [exerciseId, name] of Object.entries(primaryNamesByLanguage[language])) {
    if (!exerciseIds.has(exerciseId) || !exactNameMatchedExerciseIds.has(exerciseId)) {
      continue
    }

    const normalizedName = normalizePrimaryName(name)
    if (!normalizedName) {
      continue
    }

    const current = catalogIdsByNormalizedPrimaryName.get(normalizedName) ?? new Set<string>()
    current.add(exerciseId)
    catalogIdsByNormalizedPrimaryName.set(normalizedName, current)
  }
}

function getLocalizedExerciseName(t: TFunction, catalogExerciseId: string) {
  const value = t(`exercises:names.${catalogExerciseId}`, {
    defaultValue: '',
    fallbackLng: false,
  })

  return typeof value === 'string' && value.trim() ? value : null
}

export function findCatalogExerciseIdByExactName(name: string) {
  const normalizedName = normalizePrimaryName(name)
  const catalogIds = catalogIdsByNormalizedPrimaryName.get(normalizedName)

  if (!catalogIds || catalogIds.size !== 1) {
    return null
  }

  return Array.from(catalogIds)[0]
}

export function resolveCatalogExerciseId(input: ExerciseNameSource) {
  const catalogExerciseId = input.catalogExerciseId?.trim()
  if (catalogExerciseId && exerciseIds.has(catalogExerciseId)) {
    return catalogExerciseId
  }

  return findCatalogExerciseIdByExactName(input.name ?? '')
}

export function getDisplayExerciseName(t: TFunction, exercise: ExerciseNameSource) {
  const displayNameOverride = exercise.displayNameOverride?.trim()
  if (displayNameOverride) {
    return displayNameOverride
  }

  const catalogExerciseId = exercise.catalogExerciseId?.trim()
  if (catalogExerciseId) {
    return getLocalizedExerciseName(t, catalogExerciseId) ?? exercise.name?.trim() ?? catalogExerciseId
  }

  return exercise.name?.trim() ?? ''
}
