import { useMemo, useRef, useState } from 'react'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { PageHeader } from '../components/ui/PageHeader'
import { TrainingCycleEmptyState } from '../components/training-cycle/TrainingCycleEmptyState'
import { TrainingCyclePageLoading } from '../components/training-cycle/TrainingCyclePageLoading'
import { TrainingCycleSlotList } from '../components/training-cycle/TrainingCycleSlotList'
import { TrainingCycleSlotSheet } from '../components/training-cycle/TrainingCycleSlotSheet'
import type { TrainingCycleSlotListItem } from '../components/training-cycle/training-cycle-page.types'
import { getCycleSlotDateKey, getWeekdayLabel } from '../components/training-cycle/training-cycle-page-utils'
import { useTrainingCyclePageData } from '../hooks/pages/useTrainingCyclePageData'
import { useBackLinkState } from '../hooks/useRouteBack'
import { triggerHaptic } from '../lib/haptics'
import { getPlanColor } from '../lib/plan-color'
import type { TrainingCycleSlot } from '../models/types'

export function TrainingCyclePage() {
  const { t, i18n } = useTranslation()
  const {
    error,
    handleAddSlot,
    handleAssignPlan,
    handleCalibrateToday,
    handleRemoveSlot,
    handleReorderSlots,
    isLoading,
    isSubmitting,
    plans,
    todayCycleDay,
    trainingCycle,
  } = useTrainingCyclePageData()
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [slotOrder, setSlotOrder] = useState<string[] | null>(null)
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)
  const [isSorting, setIsSorting] = useState(false)
  const lastDragOverIdRef = useRef<string | null>(null)
  const backLinkState = useBackLinkState()

  const planColorMap = useMemo(
    () => new Map(plans.map((plan, index) => [plan.id, getPlanColor(index)])),
    [plans],
  )
  const orderedSlots = useMemo(() => {
    const slots = trainingCycle?.slots ?? []
    if (!slotOrder || slotOrder.length !== slots.length) {
      return slots
    }

    const slotMap = new Map(slots.map((slot) => [slot.id, slot]))
    const nextSlots = slotOrder
      .map((slotId) => slotMap.get(slotId) ?? null)
      .filter((slot): slot is TrainingCycleSlot => slot !== null)

    return nextSlots.length === slots.length ? nextSlots : slots
  }, [slotOrder, trainingCycle])

  const selectedSlot = trainingCycle?.slots.find((slot) => slot.id === selectedSlotId) ?? null
  const selectedIndex = trainingCycle?.slots.findIndex((slot) => slot.id === selectedSlotId) ?? 0
  const selectedPlan = selectedSlot?.planId
    ? plans.find((plan) => plan.id === selectedSlot.planId) ?? null
    : null
  const isSlotSheetOpen = sheetOpen && Boolean(trainingCycle && trainingCycle.slots.length > 0)

  const orderedAnchorIndex =
    todayCycleDay === null
      ? trainingCycle?.anchorIndex ?? 0
      : Math.max(
          0,
          orderedSlots.findIndex((slot) => slot.id === todayCycleDay.slot.id),
        )

  const weekdayLocale = i18n.resolvedLanguage ?? i18n.language

  const orderedSlotItems = useMemo(() => {
    return orderedSlots.map<TrainingCycleSlotListItem>((slot, index) => {
      const plan = slot.planId
        ? plans.find((item) => item.id === slot.planId) ?? null
        : null
      const color = plan ? planColorMap.get(plan.id) ?? null : null
      const isToday = todayCycleDay?.slot.id === slot.id
      const slotDateKey = trainingCycle
        ? getCycleSlotDateKey(trainingCycle.anchorDateKey, orderedAnchorIndex, index)
        : ''

      return {
        color,
        index,
        isToday,
        slot,
        plan,
        weekdayLabel: slotDateKey ? getWeekdayLabel(slotDateKey, weekdayLocale) : '',
      }
    })
  }, [orderedAnchorIndex, orderedSlots, planColorMap, plans, todayCycleDay, trainingCycle, weekdayLocale])
  const activeSlotItem =
    activeSlotId === null
      ? null
      : orderedSlotItems.find((item) => item.slot.id === activeSlotId) ?? null

  async function assignPlan(planId: string | null) {
    if (!selectedSlot) return
    await handleAssignPlan(selectedSlot.id, planId)
  }

  async function deleteSlot(slotId: string | null) {
    if (!slotId) return
    const didDelete = await handleRemoveSlot(slotId)
    if (didDelete) {
      setSelectedSlotId(null)
    }
  }

  function openSlotSheet(slotId: string) {
    setSelectedSlotId(slotId)
    setSheetOpen(true)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveSlotId(String(event.active.id))
    setIsSorting(true)
    lastDragOverIdRef.current = String(event.active.id)
    void triggerHaptic('medium')
  }

  function handleDragOver(event: DragOverEvent) {
    const overId = event.over ? String(event.over.id) : null
    if (!overId || overId === String(event.active.id) || overId === lastDragOverIdRef.current) {
      return
    }

    lastDragOverIdRef.current = overId
    void triggerHaptic('light')
  }

  function handleDragCancel() {
    setActiveSlotId(null)
    setIsSorting(false)
    lastDragOverIdRef.current = null
    void triggerHaptic('light')
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    setActiveSlotId(null)
    setIsSorting(false)
    lastDragOverIdRef.current = null
    void triggerHaptic('light')

    if (!trainingCycle || !over || active.id === over.id) {
      return
    }

    const oldIndex = orderedSlots.findIndex((slot) => slot.id === active.id)
    const newIndex = orderedSlots.findIndex((slot) => slot.id === over.id)

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return
    }

    const nextOrderIds = arrayMove(orderedSlots, oldIndex, newIndex).map((slot) => slot.id)

    setSlotOrder(nextOrderIds)

    void handleReorderSlots(nextOrderIds).then((didReorder) => {
      if (!didReorder) {
        setSlotOrder(trainingCycle.slots.map((slot) => slot.id))
        return
      }
    })
  }

  return (
    <div className="flex h-[calc(100vh-5rem-env(safe-area-inset-bottom))] min-h-0 flex-col bg-[var(--surface)]">
      <PageHeader
        title={t('trainingCycle.title')}
        subtitle={t('trainingCycle.currentCycleDays', { days: trainingCycle?.slots.length || 0 })}
        backFallbackTo="/plans"
        actions={
          <Link
            to="/calendar"
            state={backLinkState}
            viewTransition
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--outline-variant)] text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--on-surface-variant)]/5"
            aria-label={t('trainingCycle.calendar')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </Link>
        }
      />

      {!isLoading && trainingCycle && trainingCycle.slots.length > 0 ? (
        <div className="mx-4 mt-1 rounded-full bg-[var(--surface-container)] px-3 py-2 text-center text-[12px] font-medium text-[var(--on-surface-variant)]">
          {t('trainingCycle.interactionHint')}
        </div>
      ) : null}

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <TrainingCyclePageLoading showHeader={false} />
        ) : trainingCycle && trainingCycle.slots.length > 0 ? (
          <TrainingCycleSlotList
            activeSlotItem={activeSlotItem}
            isSorting={isSorting}
            isSubmitting={isSubmitting}
            onAddSlot={() => void handleAddSlot()}
            onCalibrateToday={(slotId) => void handleCalibrateToday(slotId)}
            onDragCancel={handleDragCancel}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            onOpenSheet={openSlotSheet}
            orderedSlotItems={orderedSlotItems}
          />
        ) : (
          <TrainingCycleEmptyState
            isSubmitting={isSubmitting}
            onAddSlot={() => void handleAddSlot()}
          />
        )}
      </div>

      <TrainingCycleSlotSheet
        isSubmitting={isSubmitting}
        onAssignPlan={(planId) => void assignPlan(planId)}
        onClose={() => setSheetOpen(false)}
        onDeleteSlot={(slotId) => void deleteSlot(slotId)}
        open={isSlotSheetOpen}
        selectedIndex={selectedIndex}
        selectedSlotId={selectedSlotId}
        selectedPlan={selectedPlan}
        planColorMap={planColorMap}
        plans={plans}
      />
    </div>
  )
}
