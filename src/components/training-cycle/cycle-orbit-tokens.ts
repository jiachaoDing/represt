import { listSpringTransition } from '../motion/motion-tokens'

export const cycleOrbitTokens = {
  node: { size: 24, numberedSize: 32, borderWidth: 1, focusedScale: 1.2 },
  focus: {
    color: 'var(--cycle-focus)',
    shadow: '0 0 0 2px var(--surface), 0 0 0 4px var(--cycle-focus)',
  },
  today: { size: 4, color: 'var(--on-surface-variant)' },
  track: { color: 'var(--cycle-track)', width: 1, opacity: 0.25, edgeOpacity: 0.08 },
  falloff: { nodeScale: 0.45, cardScale: 0.12, opacity: 0.5 },
} as const

// Scroll centering, node switching and snap settling share the existing spring.
export const cycleOrbitTransition = listSpringTransition
export const cycleOrbitReducedTransition = { type: 'tween', duration: 0 } as const

// Distance is normalized by each layout. Only visual emphasis is shared.
export function getCycleOrbitEmphasis(distance: number) {
  const falloff = Math.min(1, Math.abs(distance)) ** 2
  return {
    nodeScale: 1 - cycleOrbitTokens.falloff.nodeScale * falloff,
    cardScale: 1 - cycleOrbitTokens.falloff.cardScale * falloff,
    opacity: 1 - cycleOrbitTokens.falloff.opacity * falloff,
  }
}
