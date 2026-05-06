import { useMemo, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { muscleGroups, type MuscleDistributionItem, type MuscleGroup } from '../../domain/exercise-catalog'
import { getMuscleGroupName, getMuscleGroupShortName } from '../../lib/exercise-catalog-i18n'
import {
  createEqualMuscleDistribution,
  normalizeMuscleDistribution,
} from './utils'

const chartSize = 220
const chartCenter = chartSize / 2
const chartRadius = 96
const minSliceRatio = 0.05
const sliceColors = [
  'var(--plan-1)',
  'var(--plan-2)',
  'var(--plan-3)',
  'var(--plan-4)',
  'var(--plan-5)',
  'var(--tertiary)',
  'var(--primary)',
]

type MuscleDistributionEditorProps = {
  disabled: boolean
  value: MuscleDistributionItem[]
  onChange: (value: MuscleDistributionItem[]) => void
}

function getPoint(ratio: number, radius = chartRadius) {
  const angle = ratio * Math.PI * 2 - Math.PI / 2
  return {
    x: chartCenter + Math.cos(angle) * radius,
    y: chartCenter + Math.sin(angle) * radius,
  }
}

function getSlicePath(startRatio: number, endRatio: number) {
  const start = getPoint(startRatio)
  const end = getPoint(endRatio)
  const largeArcFlag = endRatio - startRatio > 0.5 ? 1 : 0

  return [
    `M ${chartCenter} ${chartCenter}`,
    `L ${start.x} ${start.y}`,
    `A ${chartRadius} ${chartRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

function getPointerRatio(event: PointerEvent<SVGCircleElement>) {
  const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
  if (!rect) {
    return 0
  }

  const x = event.clientX - rect.left - rect.width / 2
  const y = event.clientY - rect.top - rect.height / 2
  const angle = Math.atan2(y, x) + Math.PI / 2
  return ((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getDistributionRatio(value: MuscleDistributionItem[], groupId: MuscleGroup) {
  return value.find((item) => item.muscleGroupId === groupId)?.ratio ?? 0
}

export function MuscleDistributionEditor({ disabled, value, onChange }: MuscleDistributionEditorProps) {
  const { t } = useTranslation()
  const [activeHandle, setActiveHandle] = useState<number | null>(null)
  const selectedGroups = value.map((item) => item.muscleGroupId)
  const slices = useMemo(() => {
    return value.reduce<{
      cursor: number
      items: Array<{ color: string; end: number; item: MuscleDistributionItem; start: number }>
    }>((acc, item, index) => {
      const start = acc.cursor
      const end = acc.cursor + item.ratio
      return {
        cursor: end,
        items: [...acc.items, {
          color: sliceColors[index % sliceColors.length],
          end,
          item,
          start,
        }],
      }
    }, { cursor: 0, items: [] }).items
  }, [value])

  function handleToggle(groupId: MuscleGroup) {
    if (disabled) {
      return
    }

    const nextGroups = selectedGroups.includes(groupId)
      ? selectedGroups.filter((item) => item !== groupId)
      : [...selectedGroups, groupId]
    onChange(createEqualMuscleDistribution(nextGroups))
  }

  function handleDrag(handleIndex: number, event: PointerEvent<SVGCircleElement>) {
    if (disabled || value.length < 2) {
      return
    }

    const nextIndex = (handleIndex + 1) % value.length
    const previousBoundary = value
      .slice(0, handleIndex)
      .reduce((sum, item) => sum + item.ratio, 0)
    const nextBoundary = handleIndex === value.length - 1
      ? 1 + value[0].ratio
      : value
        .slice(0, handleIndex + 2)
        .reduce((sum, item) => sum + item.ratio, 0)
    const rawPointerRatio = getPointerRatio(event)
    const pointerRatio = handleIndex === value.length - 1 && rawPointerRatio < previousBoundary
      ? rawPointerRatio + 1
      : rawPointerRatio
    const boundary = clamp(
      pointerRatio,
      previousBoundary + minSliceRatio,
      nextBoundary - minSliceRatio,
    )

    onChange(normalizeMuscleDistribution(value.map((item, index) => {
      if (index === handleIndex) {
        return { ...item, ratio: boundary - previousBoundary }
      }
      if (index === nextIndex) {
        return { ...item, ratio: nextBoundary - boundary }
      }
      return item
    })))
  }

  function handlePointerDown(handleIndex: number, event: PointerEvent<SVGCircleElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setActiveHandle(handleIndex)
    handleDrag(handleIndex, event)
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-2">
        {muscleGroups.map((groupId) => {
          const selectedIndex = selectedGroups.indexOf(groupId)
          const isSelected = selectedIndex >= 0
          const ratio = getDistributionRatio(value, groupId)

          return (
            <button
              key={groupId}
              type="button"
              disabled={disabled}
              onClick={() => handleToggle(groupId)}
              className={[
                'flex min-h-12 items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition-colors disabled:opacity-40',
                isSelected
                  ? 'border-[var(--primary)] bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                  : 'border-[var(--outline-variant)]/40 bg-[var(--surface-container)] text-[var(--on-surface-variant)]',
              ].join(' ')}
              aria-pressed={isSelected}
            >
              <span className="flex min-w-0 items-center gap-2">
                {isSelected ? (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: sliceColors[selectedIndex % sliceColors.length] }}
                  />
                ) : null}
                <span className="min-w-0 truncate">{getMuscleGroupName(t, groupId)}</span>
              </span>
              {isSelected ? (
                <span className="shrink-0 text-xs">
                  {t('summary.exerciseRecords.distributionValue', { value: Math.round(ratio * 100) })}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="mt-5 flex flex-col items-center gap-4">
        <svg
          viewBox={`0 0 ${chartSize} ${chartSize}`}
          className="h-[220px] w-[220px] touch-none overflow-visible"
          role="img"
          aria-label={t('summary.exerciseRecords.distributionChartLabel')}
        >
          <circle cx={chartCenter} cy={chartCenter} r={chartRadius} fill="var(--surface-container)" />
          {slices.map((slice) => (
            <path
              key={slice.item.muscleGroupId}
              d={getSlicePath(slice.start, slice.end)}
              fill={slice.color}
              stroke="var(--surface)"
              strokeWidth="2"
            />
          ))}
          {slices.map((slice) => {
            const point = getPoint((slice.start + slice.end) / 2, 70)
            return (
              <text
                key={`${slice.item.muscleGroupId}-label`}
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none select-none fill-[var(--surface)] text-[13px] font-bold"
              >
                {getMuscleGroupShortName(t, slice.item.muscleGroupId)}
              </text>
            )
          })}
          <circle cx={chartCenter} cy={chartCenter} r="44" fill="var(--surface)" />
          {slices.slice(0, -1).map((slice, index) => {
            const point = getPoint(slice.end % 1, chartRadius + 1)
            return (
              <circle
                key={slice.item.muscleGroupId}
                cx={point.x}
                cy={point.y}
                r={activeHandle === index ? 8 : 6}
                fill="var(--surface)"
                stroke="var(--primary)"
                strokeWidth="2.5"
                className="cursor-grab"
                onPointerDown={(event) => handlePointerDown(index, event)}
                onPointerMove={(event) => {
                  if (activeHandle === index) {
                    handleDrag(index, event)
                  }
                }}
                onPointerUp={() => setActiveHandle(null)}
                onPointerCancel={() => setActiveHandle(null)}
                aria-label={t('summary.exerciseRecords.adjustDistributionHandle')}
              />
            )
          })}
        </svg>

        {value.length === 0 ? (
          <p className="text-center text-sm font-medium text-[var(--on-surface-variant)]">
            {t('summary.exerciseRecords.noDistribution')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
