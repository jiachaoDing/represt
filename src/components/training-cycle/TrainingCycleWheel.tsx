import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  wrap,
  type MotionValue,
  type PanInfo,
} from 'framer-motion'
import { useTranslation } from 'react-i18next'

import type { TrainingCycleSlot } from '../../models/types'
import type { PlanColor } from '../../lib/plan-color'
import { wheelEaseTransition } from '../motion/motion-tokens'
import { triggerHaptic } from '../../lib/haptics'

type TrainingCycleWheelProps = {
  slots: TrainingCycleSlot[]
  currentIndex: number | null
  selectedIndex: number | null
  getPlanColor: (planId: string) => PlanColor | null
  getDayLabel: (index: number) => string
  onSelect: (index: number) => Promise<boolean>
  disabled: boolean
}

function getOffset(index: number, position: number, count: number) {
  // One- and two-day cycles have a single visible instance of each day.
  return count <= 2 ? index - position : wrap(-count / 2, count / 2, index - position)
}

function getNodeSpacing(width: number) {
  return Math.max(44, Math.min(56, (width - 44) / 4))
}

function settleWheel(position: MotionValue<number>, index: number, count: number, reduceMotion: boolean | null) {
  const target = position.get() + getOffset(index, position.get(), count)
  return animate(position, target, {
    ...wheelEaseTransition,
    duration: reduceMotion ? 0 : wheelEaseTransition.duration,
  })
}

type WheelNodeProps = {
  index: number
  copy: number
  count: number
  position: MotionValue<number>
  width: MotionValue<number>
  color: PlanColor | null
  isSelected: boolean
  isCurrent: boolean
  isFocusable: boolean
  label: string
  disabled: boolean
  onSelect: (index: number) => void
}

function WheelNode({
  index,
  copy,
  count,
  position,
  width,
  color,
  isSelected,
  isCurrent,
  isFocusable,
  label,
  disabled,
  onSelect,
}: WheelNodeProps) {
  const offset = useTransform(() => getOffset(index, position.get(), count) + copy * count)
  const spacing = useTransform(() => getNodeSpacing(width.get()))
  const x = useTransform(() => offset.get() * spacing.get())
  const y = useTransform(() => 52 - 44 * Math.min(1, (2 * x.get() / width.get()) ** 2))
  const scale = useTransform(() => Math.max(0.38, 1 - Math.abs(offset.get()) * 0.2))
  const visibility = useTransform(() => {
    const distance = Math.abs(offset.get())
    const radius = Math.min(count / 2, (width.get() / 2 - 22) / spacing.get())
    const edgeFade = count <= 2 ? 1 : Math.min(1, Math.max(0, (radius - distance) * 2))
    return Math.max(0.18, 1 - distance * 0.25) * edgeFade
  })
  const pointerEvents = useTransform(() => visibility.get() > 0.08 ? 'auto' : 'none')

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(index)}
      disabled={disabled}
      tabIndex={copy === 0 && isFocusable ? 0 : -1}
      aria-hidden={copy !== 0 ? true : undefined}
      aria-label={label}
      aria-pressed={isSelected}
      aria-current={isCurrent ? 'date' : undefined}
      data-wheel-focus={copy === 0 && isFocusable ? 'true' : undefined}
      style={{ x, y, opacity: visibility, pointerEvents, outlineColor: color?.solid ?? 'var(--outline)' }}
      className="absolute left-1/2 top-0 -ml-[22px] -mt-[22px] flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] disabled:cursor-default tap-highlight-transparent"
    >
      <motion.span
        aria-hidden="true"
        className="h-6 w-6 rounded-full"
        style={{
          scale,
          backgroundColor: color?.solid ?? 'var(--outline)',
          boxShadow: isSelected
            ? `0 3px 14px color-mix(in srgb, ${color?.solid ?? 'var(--outline)'} 16%, transparent)`
            : 'none',
        }}
      />
      {isCurrent ? <span aria-hidden="true" className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[var(--on-surface-variant)]" /> : null}
    </motion.button>
  )
}

export function TrainingCycleWheel({
  slots,
  currentIndex,
  selectedIndex,
  getPlanColor,
  getDayLabel,
  onSelect,
  disabled,
}: TrainingCycleWheelProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ origin: number; tick: number } | null>(null)
  const suppressClickRef = useRef(false)
  const selectingRef = useRef(false)
  const requestStateRef = useRef({ version: 0 })
  const focusIndex = selectedIndex ?? currentIndex ?? 0
  const position = useMotionValue(focusIndex)
  const width = useMotionValue(320)
  const reduceMotion = useReducedMotion()
  const count = slots.length

  useMotionValueEvent(position, 'change', (value) => {
    const drag = dragRef.current
    if (drag && Math.round(value) !== drag.tick) {
      drag.tick = Math.round(value)
      void triggerHaptic('light')
    }
  })

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    width.set(Math.max(1, container.clientWidth))
    const observer = new ResizeObserver(([entry]) => width.set(Math.max(1, entry.contentRect.width)))
    observer.observe(container)
    return () => observer.disconnect()
  }, [width])

  useEffect(() => {
    if (count === 0) return
    const requestState = requestStateRef.current
    dragRef.current = null
    settleWheel(position, focusIndex, count, reduceMotion)
    const container = containerRef.current
    if (container?.contains(document.activeElement)) {
      container.querySelector<HTMLButtonElement>('[data-wheel-focus="true"]')?.focus({ preventScroll: true })
    }
    return () => {
      requestState.version++
      position.stop()
    }
  }, [count, focusIndex, position, reduceMotion])

  async function selectDay(index: number) {
    if (disabled || selectingRef.current) return
    const requestState = requestStateRef.current
    const requestSequence = ++requestState.version
    selectingRef.current = true
    try {
      const accepted = await onSelect(index)
      if (accepted && index !== focusIndex) void triggerHaptic('light')
      if (requestSequence === requestState.version) {
        settleWheel(position, accepted ? index : focusIndex, count, reduceMotion)
      }
    } finally {
      selectingRef.current = false
    }
  }

  function handlePan(_event: PointerEvent, info: PanInfo) {
    if (disabled || selectingRef.current || count < 2) return
    if (!dragRef.current) {
      if (Math.abs(info.offset.x) < 8 || Math.abs(info.offset.x) <= Math.abs(info.offset.y)) return
      position.stop()
      dragRef.current = { origin: position.get(), tick: Math.round(position.get()) }
      suppressClickRef.current = true
    }
    const nextPosition = dragRef.current.origin - info.offset.x / getNodeSpacing(width.get())
    position.set(count === 2 ? Math.max(0, Math.min(1, nextPosition)) : nextPosition)
  }

  function handlePanEnd(event: PointerEvent, info: PanInfo) {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    if (event.type === 'pointercancel' || disabled) {
      settleWheel(position, focusIndex, count, reduceMotion)
      return
    }
    const spacing = getNodeSpacing(width.get())
    const releasedPosition = drag.origin - info.offset.x / spacing
    const momentum = Math.max(-0.8, Math.min(0.8, -info.velocity.x / spacing * 0.12))
    const nearestDay = Math.round(releasedPosition + momentum)
    const nextIndex = count === 2
      ? Math.max(0, Math.min(1, nearestDay))
      : wrap(0, count, nearestDay)
    void selectDay(nextIndex)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled || count === 0) return
    let nextIndex = focusIndex
    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = (focusIndex - 1 + count) % count
        break
      case 'ArrowRight':
        nextIndex = (focusIndex + 1) % count
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = count - 1
        break
      default:
        return
    }
    event.preventDefault()
    void selectDay(nextIndex)
  }

  return (
    <motion.div
      ref={containerRef}
      role="group"
      aria-label={t('trainingCycle.cyclePreview')}
      onKeyDown={handleKeyDown}
      onPan={handlePan}
      onPanEnd={handlePanEnd}
      onPointerDownCapture={() => { suppressClickRef.current = false }}
      onClickCapture={(event) => {
        if (suppressClickRef.current && event.detail !== 0) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
      className="relative mx-auto h-[88px] w-full max-w-[26rem] touch-pan-y select-none overflow-hidden"
    >
      <svg aria-hidden="true" viewBox="0 0 400 88" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full fill-none text-[var(--outline-variant)]/50">
        <path d="M 0 8 Q 200 96 400 8" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      {slots.flatMap((slot, index) => (count <= 2 ? [0] : [-1, 0, 1]).map((copy) => (
        <WheelNode
          key={`${slot.id}-${copy}`}
          index={index}
          copy={copy}
          count={count}
          position={position}
          width={width}
          color={slot.planId ? getPlanColor(slot.planId) : null}
          isSelected={selectedIndex === index}
          isCurrent={currentIndex === index}
          isFocusable={focusIndex === index}
          label={getDayLabel(index)}
          disabled={disabled}
          onSelect={selectDay}
        />
      )))}
    </motion.div>
  )
}
