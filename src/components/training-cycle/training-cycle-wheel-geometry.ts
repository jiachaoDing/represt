export const cycleWheelRowHeight = 112

export function getCycleOrbitEmphasis(distance: number) {
  const falloff = Math.min(1, Math.abs(distance)) ** 2
  return {
    nodeScale: 1 - 0.45 * falloff,
    cardScale: 1 - 0.12 * falloff,
    opacity: 1 - 0.5 * falloff,
  }
}

export function getCycleWheelGeometry(height: number) {
  const halfHeight = Math.max(1, height / 2)
  const inset = Math.min(32, halfHeight / 2)
  const radius = (halfHeight ** 2 + inset ** 2) / (2 * inset)
  return { halfHeight, inset, radius }
}
