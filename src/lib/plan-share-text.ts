import type { TFunction } from 'i18next'

import type { PlanTransferData } from './plan-transfer-types'

export function getPlanTransferExerciseCount(data: PlanTransferData) {
  return data.plans.reduce((total, plan) => total + plan.exercises.length, 0)
}

export function getPlanTransferMainExercises(data: PlanTransferData, limit = 4) {
  return data.plans
    .flatMap((plan) => plan.exercises)
    .map((exercise) => exercise.name.trim())
    .filter((name) => name.length > 0)
    .slice(0, limit)
}

export function getPlanTransferTitle(data: PlanTransferData, fallback: string) {
  return data.plans[0]?.planName.trim() || fallback
}

export function buildPlanShareText(
  t: TFunction,
  data: PlanTransferData,
  code: string,
  url: string,
) {
  const title = getPlanTransferTitle(data, t('common.unnamedPlan'))
  const mainExercises = getPlanTransferMainExercises(data)
  const lines = [
    t('planShare.shareText.title', { name: title }),
    '',
    t('planShare.shareText.summary', {
      count: getPlanTransferExerciseCount(data),
    }),
  ]

  if (mainExercises.length > 0) {
    lines.push(t('planShare.shareText.mainExercises', { exercises: mainExercises.join(t('planShare.exerciseSeparator')) }))
  }

  lines.push('', t('planShare.shareText.code', { code }), t('planShare.shareText.open'), url)

  return lines.join('\n')
}
