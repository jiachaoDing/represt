export const cycleWheelRowHeight = 112

export { getCycleOrbitEmphasis } from './cycle-orbit-tokens'

export function getCycleWheelGeometry(height: number) {
  const halfHeight = Math.max(1, height / 2)
  const inset = Math.min(32, halfHeight / 2)
  const radius = (halfHeight ** 2 + inset ** 2) / (2 * inset)
  return { halfHeight, inset, radius }
}
