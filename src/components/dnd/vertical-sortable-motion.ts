import type { DropAnimation, Modifier } from '@dnd-kit/core'

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
})

export const verticalSortModifiers = [restrictToVerticalAxis]

export const verticalSortDropAnimation: DropAnimation = {
  duration: 160,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
}

export const verticalSortTransition = {
  duration: 180,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
}
