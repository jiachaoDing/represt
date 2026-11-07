import { useState } from 'react'
import type { TFunction } from 'i18next'

export const weightUnits = ['kg', 'lb'] as const

export type WeightUnit = (typeof weightUnits)[number]

export const weightUnitPreferenceStorageKey = 'trainre.weightUnitPreference'

const kgPerLb = 0.45359237

function isWeightUnit(value: string | null): value is WeightUnit {
  return weightUnits.includes(value as WeightUnit)
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2))).replace(/\.0$/, '')
}

function formatWeightUnitNumber(value: number, unit: WeightUnit) {
  return unit === 'lb' ? String(Math.round(value)) : formatNumber(value)
}

export function getStoredWeightUnitPreference(): WeightUnit {
  if (typeof window === 'undefined') {
    return 'kg'
  }

  const value = window.localStorage.getItem(weightUnitPreferenceStorageKey)
  return isWeightUnit(value) ? value : 'kg'
}

export function setStoredWeightUnitPreference(unit: WeightUnit) {
  window.localStorage.setItem(weightUnitPreferenceStorageKey, unit)
}

export function useWeightUnitPreference() {
  const [unit, setUnitState] = useState<WeightUnit>(() => getStoredWeightUnitPreference())

  function setUnit(nextUnit: WeightUnit) {
    setStoredWeightUnitPreference(nextUnit)
    setUnitState(nextUnit)
  }

  return {
    setUnit,
    unit,
  }
}

export function convertKgToWeightUnit(weightKg: number, unit = getStoredWeightUnitPreference()) {
  return unit === 'lb' ? weightKg / kgPerLb : weightKg
}

export function convertWeightUnitToKg(weight: number, unit = getStoredWeightUnitPreference()) {
  return unit === 'lb' ? weight * kgPerLb : weight
}

export function parseDisplayWeightToKg(value: string, unit = getStoredWeightUnitPreference()) {
  const parsed = Number.parseFloat(value.trim())
  return Number.isFinite(parsed) ? Math.max(0, convertWeightUnitToKg(parsed, unit)) : null
}

export function kgToDisplayWeightString(weightKg: number | null | undefined, unit = getStoredWeightUnitPreference()) {
  return weightKg === null || weightKg === undefined
    ? ''
    : formatWeightUnitNumber(convertKgToWeightUnit(weightKg, unit), unit)
}

export function formatWeightKg(weightKg: number, t: TFunction, unit = getStoredWeightUnitPreference()) {
  return t(`common.weight.${unit}`, {
    value: formatWeightUnitNumber(convertKgToWeightUnit(weightKg, unit), unit),
  })
}

export function formatWeightRepsVolume(volumeKg: number, t: TFunction, unit = getStoredWeightUnitPreference()) {
  return t(`common.weightVolume.${unit}`, {
    value: formatWeightUnitNumber(convertKgToWeightUnit(volumeKg, unit), unit),
  })
}

export function formatLoadDistanceVolume(volumeKgMeters: number, t: TFunction, unit = getStoredWeightUnitPreference()) {
  return unit === 'lb'
    ? t('common.loadDistanceVolume.lbMeters', {
        value: formatWeightUnitNumber(convertKgToWeightUnit(volumeKgMeters, unit), unit),
      })
    : t('common.loadDistanceVolume.kgMeters', { value: formatNumber(volumeKgMeters) })
}
