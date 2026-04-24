export const pageSpringTransition = {
  type: 'spring',
  stiffness: 360,
  damping: 34,
  mass: 0.86,
} as const

export const listSpringTransition = {
  type: 'spring',
  stiffness: 420,
  damping: 36,
  mass: 0.8,
} as const

export const sheetSpringTransition = {
  type: 'spring',
  stiffness: 320,
  damping: 30,
  mass: 0.94,
} as const

export const dialogSpringTransition = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.78,
} as const

export const quickEaseTransition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
} as const
