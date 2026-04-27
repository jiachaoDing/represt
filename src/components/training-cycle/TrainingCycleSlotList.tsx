import { createPortal } from 'react-dom'
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
import type { TrainingCycleSlotListItem } from './training-cycle-page.types'

type TrainingCycleSlotListProps = {
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
    <section className="relative mx-auto mt-4 max-w-lg pb-28">
      <div className="absolute bottom-6 left-10 top-8 w-px bg-[var(--outline-variant)]/40" />

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
              onCalibrateToday={onCalibrateToday}
              onOpenSheet={onOpenSheet}
              slot={slot}
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
                <div className="opacity-95">
                  <TrainingCycleSlotRow
                    index={activeSlotItem.index}
                    isDragging
                    isSorting
                    isSubmitting
                    onCalibrateToday={onCalibrateToday}
                    onOpenSheet={onOpenSheet}
                    slot={activeSlotItem.slot}
                    color={activeSlotItem.color}
                    isToday={activeSlotItem.isToday}
                    template={activeSlotItem.template}
                    weekdayLabel={activeSlotItem.weekdayLabel}
                  />
                </div>
              </DragOverlay>,
              document.body,
            )
          : null}
      </DndContext>

      <div className="relative flex gap-4 px-4 py-3">
        <div className="relative z-10 flex w-12 shrink-0 flex-col items-center pt-2">
          <button
            type="button"
            onClick={onAddSlot}
            disabled={isSubmitting}
            className="flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-60"
            aria-label={t('trainingCycle.addDay')}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--secondary-container)] text-[var(--on-secondary-container)] shadow-[0_4px_12px_rgba(0,0,0,0.08)] ring-4 ring-[var(--secondary)]/10">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={onAddSlot}
          disabled={isSubmitting}
          className="flex min-h-14 flex-1 items-center rounded-3xl border border-dashed border-[var(--primary)]/30 bg-[var(--primary-container)]/20 px-5 text-left text-[var(--primary)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <span className="text-[15px] font-semibold">{t('trainingCycle.addDay')}</span>
        </button>
      </div>
    </section>
  )
}
