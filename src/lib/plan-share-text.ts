import type { TFunction } from 'i18next'

import type { PlanTransferData } from './plan-transfer-types'
import type { SharedPlanKind } from './plan-share-api'

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

export function getPlanTransferShareTitle(t: TFunction, data: PlanTransferData, kind: SharedPlanKind = 'plan-template') {
  if (kind === 'training-cycle') {
    return t('planShare.cycleName')
  }

  if (data.plans.length === 1) {
    return getPlanTransferTitle(data, t('common.unnamedPlan'))
  }

  return t('planShare.multiPlanTitle', { count: data.plans.length })
}

export function buildPlanShareText(
  t: TFunction,
  data: PlanTransferData,
  code: string,
  url: string,
  kind: SharedPlanKind = 'plan-template',
) {
  const title = getPlanTransferTitle(data, t('common.unnamedPlan'))
  const mainExercises = getPlanTransferMainExercises(data)
  const lines = [
    kind === 'training-cycle'
      ? t('planShare.shareText.cycleTitle', { days: data.cycle.length, count: data.plans.length })
      : data.plans.length > 1
        ? t('planShare.shareText.multiPlanTitle', { count: data.plans.length })
      : t('planShare.shareText.title', { name: title }),
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
