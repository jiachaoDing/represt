import type { WorkoutPlan, WorkoutSession } from '../models/types'

export type PlanColor = {
  /** State-only dots, orbit nodes and auxiliary marks without text. */
  solid: string
  /** Text-bearing chips, cards, containers and numbered nodes. */
  soft: string
  /** Foreground paired with soft in both light and dark themes. */
  text: string
}

const planPalette: PlanColor[] = [
  {
    solid: 'var(--plan-1)',
    soft: 'var(--plan-1-container)',
    text: 'var(--on-plan-1-container)',
  },
  {
    solid: 'var(--plan-2)',
    soft: 'var(--plan-2-container)',
    text: 'var(--on-plan-2-container)',
  },
  {
    solid: 'var(--plan-3)',
    soft: 'var(--plan-3-container)',
    text: 'var(--on-plan-3-container)',
  },
  {
    solid: 'var(--plan-4)',
    soft: 'var(--plan-4-container)',
    text: 'var(--on-plan-4-container)',
  },
  {
    solid: 'var(--plan-5)',
    soft: 'var(--plan-5-container)',
    text: 'var(--on-plan-5-container)',
  },
]

export function getPlanColor(index: number) {
  return planPalette[((index % planPalette.length) + planPalette.length) % planPalette.length]
}

// Existing templates have no category field. Recognize common category names,
// then keep custom template colors stable across sorting and insertion.
export function getTemplateColor(plan: { id: string; name: string }): PlanColor {
  if (/上肢|upper\b/iu.test(plan.name)) return getPlanColor(1)
  if (/下肢|lower\b/iu.test(plan.name)) return getPlanColor(0)
  if (/有氧|跑步|间歇|cardio|aerobic|running|zone\s*[1-5]/iu.test(plan.name)) return getPlanColor(2)
  if (/休息|rest\b/iu.test(plan.name)) return restDayColor
  const hash = Array.from(plan.id).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0)
  return getPlanColor(hash)
}

export function getSessionPlanColor(session: WorkoutSession, plans: ReadonlyMap<string, WorkoutPlan>) {
  if (!session.plannedPlanId) return null
  const plan = plans.get(session.plannedPlanId)
  return getTemplateColor(plan ?? {
    id: session.plannedPlanId,
    name: session.plannedPlanNameSnapshot ?? '',
  })
}

export const restDayColor: PlanColor = {
  solid: 'var(--cycle-rest)',
  soft: 'var(--cycle-rest-container)',
  text: 'var(--on-cycle-rest-container)',
}
