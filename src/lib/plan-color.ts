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
