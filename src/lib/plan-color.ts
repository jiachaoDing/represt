export type PlanColor = {
  solid: string
  soft: string
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

export const restDayColor: PlanColor = {
  solid: 'var(--cycle-rest)',
  soft: 'var(--cycle-rest-container)',
  text: 'var(--on-cycle-rest-container)',
}
