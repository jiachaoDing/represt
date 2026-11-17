import { useMemo, useRef, useState } from 'react'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { CircleHelp, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { PageHeader } from '../components/ui/PageHeader'
import { PlanShareSheet } from '../components/plans/PlanShareSheet'
import { TrainingCycleEmptyState } from '../components/training-cycle/TrainingCycleEmptyState'
import { TrainingCyclePageLoading } from '../components/training-cycle/TrainingCyclePageLoading'
import { TrainingCycleSlotList } from '../components/training-cycle/TrainingCycleSlotList'
import { TrainingCycleSlotSheet } from '../components/training-cycle/TrainingCycleSlotSheet'
import type { TrainingCycleSlotListItem } from '../components/training-cycle/training-cycle-page.types'
import { getCycleSlotDateKey, getWeekdayLabel } from '../components/training-cycle/training-cycle-page-utils'
import { useTrainingCyclePageData } from '../hooks/pages/useTrainingCyclePageData'
import { useBackLinkState } from '../hooks/useRouteBack'
import { triggerHaptic } from '../lib/haptics'
import { getTemplateColor } from '../lib/plan-color'
import { getViewedCycleSlotId, setViewedCycleSlotId } from '../lib/cycle-view-selection'
import type { TrainingCycleSlot } from '../models/types'

export function TrainingCyclePage() {
  const { t, i18n } = useTranslation()
  const {
    error,
    handleAddSlot,
    handleAssignPlan,
    handleCreatePlan,
    handleCalibrateToday,
    handleRemoveSlot,
    handleReorderSlots,
    isLoading,
    isSubmitting,
    plans,
    refreshPlans,
    todayCycleDay,
    trainingCycle,
  } = useTrainingCyclePageData()
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetSession, setSheetSession] = useState(0)
  const [slotOrder, setSlotOrder] = useState<string[] | null>(null)
  const [isSorting, setIsSorting] = useState(false)
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false)
  const [focusedSlotId, setFocusedSlotId] = useState(getViewedCycleSlotId)
  const [initialFocusSlotId] = useState(getViewedCycleSlotId)
  const lastDragOverIdRef = useRef<string | null>(null)
  const backLinkState = useBackLinkState()

  const planColorMap = useMemo(
    () => new Map(plans.map((plan) => [plan.id, getTemplateColor(plan)])),
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
  const isSlotSheetOpen = sheetOpen && selectedSlot !== null

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

  async function assignPlan(planId: string | null) {
    if (!selectedSlot) return false
    return handleAssignPlan(selectedSlot.id, planId)
  }

  async function deleteSlot(slotId: string | null) {
    if (!slotId) return false
    const didDelete = await handleRemoveSlot(slotId)
    if (didDelete) {
      setSelectedSlotId(null)
    }
    return didDelete
  }

  function openSlotSheet(slotId: string) {
    setFocusedSlotId(slotId)
    setViewedCycleSlotId(slotId, true)
    setSelectedSlotId(slotId)
    setSheetSession((session) => session + 1)
    setSheetOpen(true)
  }

  function handleDragStart(event: DragStartEvent) {
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
    setIsSorting(false)
    lastDragOverIdRef.current = null
    void triggerHaptic('light')
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

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
    <div className="flex h-[calc(100vh_-_5rem_-_var(--app-safe-area-inset-bottom))] min-h-0 flex-col bg-[var(--surface)]">
      <PageHeader
        title={t('trainingCycle.title')}
        subtitle={t('trainingCycle.currentCycleDays', { days: trainingCycle?.slots.length || 0 })}
        backFallbackTo="/plans"
        actions={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsShareSheetOpen(true)}
              aria-label={t('planShare.cycleMenuItem')}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--on-surface-variant)]/10 tap-highlight-transparent"
            >
              <Share2 size={22} strokeWidth={2.2} aria-hidden="true" />
            </button>
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
          </div>
        }
      />

      {!isLoading && trainingCycle && trainingCycle.slots.length > 0 ? (
        <details className="relative z-10 ml-auto mr-4 shrink-0">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 px-2 text-[11px] text-[var(--on-surface-variant)]/70 [&::-webkit-details-marker]:hidden">
            <CircleHelp size={14} aria-hidden="true" />
            {t('trainingCycle.interactionHelp')}
          </summary>
          <p className="absolute right-0 top-full z-10 w-56 rounded-2xl border border-[var(--outline-variant)]/50 bg-[var(--surface-container)] px-4 py-3 text-xs leading-relaxed text-[var(--on-surface-variant)] shadow-[var(--shadow-soft)]">
            {t('trainingCycle.interactionHint')}
          </p>
        </details>
      ) : null}

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        {isLoading ? (
          <TrainingCyclePageLoading showHeader={false} />
        ) : trainingCycle && trainingCycle.slots.length > 0 ? (
          <TrainingCycleSlotList
            initialFocusSlotId={initialFocusSlotId}
            focusedSlotId={focusedSlotId}
            onFocusSlot={(slotId) => {
              setFocusedSlotId(slotId)
              setViewedCycleSlotId(slotId, true)
            }}
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
        key={sheetSession}
        error={error}
        isSubmitting={isSubmitting}
        onAssignPlan={assignPlan}
        onCreatePlan={handleCreatePlan}
        onPlansImported={refreshPlans}
        onClose={() => setSheetOpen(false)}
        onDeleteSlot={deleteSlot}
        open={isSlotSheetOpen}
        selectedIndex={selectedIndex}
        selectedSlotId={selectedSlotId}
        selectedPlan={selectedPlan}
        plans={plans}
      />

      <PlanShareSheet
        open={isShareSheetOpen}
        kind="training-cycle"
        onClose={() => setIsShareSheetOpen(false)}
      />
    </div>
  )
}
