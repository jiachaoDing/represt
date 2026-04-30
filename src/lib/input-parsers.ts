export function parseIntegerInput(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function toOptionalNumberString(value: number | null) {
  return value === null ? '' : String(value)
}

export function parseOptionalWeightKg(value: string) {
  const parsed = Number.parseFloat(value.trim())
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null
}

export function parseOptionalReps(value: string) {
  const parsed = Number.parseInt(value.trim(), 10)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null
}

export function parseOptionalDurationSeconds(value: string) {
  const parsed = Number.parseInt(value.trim(), 10)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null
}

export function parseOptionalDistanceMeters(value: string) {
  const parsed = Number.parseFloat(value.trim())
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null
}
