import { createPortal } from 'react-dom'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import { animate, useMotionValue, useReducedMotion } from 'framer-motion'
import { Plus, Repeat2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { verticalSortDropAnimation, verticalSortModifiers } from '../dnd/vertical-sortable-motion'
import { SortableTrainingCycleSlotRow } from './SortableTrainingCycleSlotRow'
import { TrainingCycleSlotRow } from './TrainingCycleSlotRow'
import { TrainingCycleWheelItem } from './TrainingCycleWheelItem'
import { cycleWheelRowHeight, getCycleWheelGeometry } from './training-cycle-wheel-geometry'
import type { TrainingCycleSlotListItem } from './training-cycle-page.types'
import { listSpringTransition } from '../motion/motion-tokens'

type TrainingCycleSlotListProps = {
  initialFocusSlotId: string | null
  focusedSlotId: string | null
  onFocusSlot: (slotId: string) => void
  activeSlotItem: TrainingCycleSlotListItem | null
  isSorting: boolean
  isSubmitting: boolean
  onAddSlot: () => void
  onCalibrateToday: (slotId: string) => void
  onDragCancel: () => void
  onDragEnd: (event: DragEndEvent) => void
  onDragOver: (event: DragOverEvent) => void
  onDragStart: (event: DragStartEvent) => void
  onOpenSheet: (slotId: string) => void
  orderedSlotItems: TrainingCycleSlotListItem[]
}

export function TrainingCycleSlotList({
  initialFocusSlotId,
  focusedSlotId,
  onFocusSlot,
  activeSlotItem,
  isSorting,
  isSubmitting,
  onAddSlot,
  onCalibrateToday,
  onDragCancel,
  onDragEnd,
  onDragOver,
  onDragStart,
  onOpenSheet,
  orderedSlotItems,
}: TrainingCycleSlotListProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const scrollAnimationRef = useRef<ReturnType<typeof animate> | null>(null)
  const scrollTop = useMotionValue(0)
  const viewportHeight = useMotionValue(0)
  const [height, setHeight] = useState(0)
  const rimGradientId = useId()
  const { inset, radius } = getCycleWheelGeometry(height)
  const rimPath = `M${48 - inset} 0 A${radius} ${radius} 0 0 1 ${48 - inset} ${Math.max(1, height)}`
  const spacer = Math.max(0, (height - cycleWheelRowHeight) / 2)
  const centeredDayRef = useRef(false)
  const previousOrderRef = useRef('')
  const rememberedIndex = orderedSlotItems.findIndex((item) => item.slot.id === initialFocusSlotId)
  const initialIndex = rememberedIndex >= 0
    ? rememberedIndex
    : Math.max(0, orderedSlotItems.findIndex((item) => item.isToday))

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const measure = () => {
      viewportHeight.set(container.clientHeight)
      setHeight(container.clientHeight)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => {
      observer.disconnect()
      scrollAnimationRef.current?.stop()
    }
  }, [viewportHeight])

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container || height === 0 || centeredDayRef.current) return
    container.scrollTop = initialIndex * cycleWheelRowHeight
    scrollTop.set(container.scrollTop)
    centeredDayRef.current = true
    const item = orderedSlotItems[initialIndex]
    if (item) onFocusSlot(item.slot.id)
  }, [height, initialIndex, onFocusSlot, orderedSlotItems, scrollTop])

  useLayoutEffect(() => {
    const order = orderedSlotItems.map((item) => item.slot.id).join(',')
    const previousOrder = previousOrderRef.current
    previousOrderRef.current = order
    const container = scrollRef.current
    if (!previousOrder || previousOrder === order || !container || !centeredDayRef.current) return
    const focusedIndex = orderedSlotItems.findIndex((item) => item.slot.id === focusedSlotId)
    const index = focusedIndex >= 0 ? focusedIndex : Math.max(0, Math.min(
      orderedSlotItems.length - 1, Math.round(container.scrollTop / cycleWheelRowHeight),
    ))
    container.scrollTop = index * cycleWheelRowHeight
    scrollTop.set(container.scrollTop)
    const item = orderedSlotItems[index]
    if (item) onFocusSlot(item.slot.id)
  }, [focusedSlotId, onFocusSlot, orderedSlotItems, scrollTop])

  function stopCentering() {
    scrollAnimationRef.current?.stop()
    if (scrollRef.current) scrollRef.current.style.scrollSnapType = isSorting ? 'none' : 'y proximity'
  }

  function openCenteredSlot(slotId: string) {
    const container = scrollRef.current
    const index = orderedSlotItems.findIndex((item) => item.slot.id === slotId)
    if (container && index >= 0) {
      stopCentering()
      // Let Motion own intermediate positions, then restore native settling.
      container.style.scrollSnapType = 'none'
      scrollAnimationRef.current = animate(container.scrollTop, index * cycleWheelRowHeight, {
        ...listSpringTransition,
        ...(reduceMotion ? { type: 'tween' as const, duration: 0 } : {}),
        onUpdate: (value) => { container.scrollTop = value },
        onComplete: () => { container.style.scrollSnapType = 'y proximity' },
      })
    }
    onOpenSheet(slotId)
  }
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        delay: 320,
        tolerance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 320,
        tolerance: 8,
      },
    }),
  )

  return (
    <section className="relative mx-auto min-h-0 w-full max-w-lg flex-1 overflow-hidden">
      <svg aria-hidden="true" viewBox={`0 0 80 ${Math.max(1, height)}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-y-0 left-0 h-full w-20 fill-none text-[var(--cycle-track)]">
        <defs>
          <linearGradient id={rimGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="0.5" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <path d={rimPath} stroke={`url(#${rimGradientId})`} strokeWidth="1" />
      </svg>
      <div
        ref={scrollRef}
        onPointerDown={stopCentering}
        onWheel={stopCentering}
        onScroll={(event) => {
          const top = event.currentTarget.scrollTop
          scrollTop.set(top)
          if (isSorting || !centeredDayRef.current) return
          const index = Math.max(0, Math.min(orderedSlotItems.length - 1, Math.round(top / cycleWheelRowHeight)))
          const item = orderedSlotItems[index]
          if (item && item.slot.id !== focusedSlotId) onFocusSlot(item.slot.id)
        }}
        style={{ scrollSnapType: isSorting ? 'none' : 'y proximity' }}
        className="scrollbar-hide relative h-full overflow-y-auto overflow-x-hidden overscroll-y-contain"
      >
        <div style={{ height: spacer }} aria-hidden="true" />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={verticalSortModifiers}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragCancel={onDragCancel}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={orderedSlotItems.map((item) => item.slot.id)}
            strategy={verticalListSortingStrategy}
          >
            {orderedSlotItems.map(({ index, slot, ...renderData }) => (
              <SortableTrainingCycleSlotRow
                key={slot.id}
                index={index}
                isSorting={isSorting}
                isSubmitting={isSubmitting}
                isFocused={slot.id === focusedSlotId}
                onCalibrateToday={onCalibrateToday}
                onOpenSheet={openCenteredSlot}
                slot={slot}
                wheelScrollTop={scrollTop}
                wheelViewportHeight={viewportHeight}
                {...renderData}
              />
            ))}
          </SortableContext>

          {activeSlotItem
            ? createPortal(
                <DragOverlay
                  adjustScale={false}
                  dropAnimation={verticalSortDropAnimation}
                  modifiers={verticalSortModifiers}
                >
                  <TrainingCycleWheelItem index={activeSlotItem.index} scrollTop={scrollTop} viewportHeight={viewportHeight}>
                    <TrainingCycleSlotRow
                      index={activeSlotItem.index}
                      isDragging
                      isSorting
                      isSubmitting
                      isFocused={activeSlotItem.slot.id === focusedSlotId}
                      onCalibrateToday={onCalibrateToday}
                      onOpenSheet={onOpenSheet}
                      slot={activeSlotItem.slot}
                      color={activeSlotItem.color}
                      isToday={activeSlotItem.isToday}
                      plan={activeSlotItem.plan}
                      weekdayLabel={activeSlotItem.weekdayLabel}
                    />
                  </TrainingCycleWheelItem>
                </DragOverlay>,
                document.body,
              )
            : null}
        </DndContext>

        <TrainingCycleWheelItem index={orderedSlotItems.length} scrollTop={scrollTop} viewportHeight={viewportHeight}>
          <div className="relative flex h-[112px] items-center px-4 pr-6">
            <span aria-hidden="true" className="pointer-events-none absolute left-10 top-1/2 h-px w-9 bg-[var(--brand-mark)]/25" />
            <button
              type="button"
              onClick={onAddSlot}
              disabled={isSubmitting || isSorting}
              className="group flex min-h-14 w-full items-center text-left text-[var(--on-surface-variant)] disabled:opacity-60"
            >
              <span className="z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--surface)]">
                <Plus size={22} style={{ transform: 'scale(var(--cycle-node-scale, 1))' }} aria-hidden="true" />
              </span>
              <span aria-hidden="true" className="w-3 shrink-0" />
              <span style={{ transform: 'scale(var(--cycle-card-scale, 1))' }} className="flex flex-1 origin-left items-center justify-between gap-2 rounded-2xl bg-[var(--surface-container)]/70 px-4 py-4 group-active:bg-[var(--surface-container-high)]">
                <span className="text-sm font-medium">{t('trainingCycle.addDay')}</span>
                <Repeat2 size={18} className="shrink-0 opacity-60" aria-hidden="true" />
              </span>
            </button>
          </div>
        </TrainingCycleWheelItem>
        <div style={{ height: spacer }} aria-hidden="true" />
      </div>
    </section>
  )
}
