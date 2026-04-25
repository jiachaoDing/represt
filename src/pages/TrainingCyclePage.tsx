import { useEffect, useMemo, useState } from 'react'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { PageHeader } from '../components/ui/PageHeader'
import { TrainingCycleEmptyState } from '../components/training-cycle/TrainingCycleEmptyState'
import { TrainingCyclePageLoading } from '../components/training-cycle/TrainingCyclePageLoading'
import { TrainingCycleSlotList } from '../components/training-cycle/TrainingCycleSlotList'
import { TrainingCycleSlotSheet } from '../components/training-cycle/TrainingCycleSlotSheet'
import type { TrainingCycleSlotListItem } from '../components/training-cycle/training-cycle-page.types'
import { getCycleSlotDateKey, getWeekdayLabel } from '../components/training-cycle/training-cycle-page-utils'
import { useTrainingCyclePageData } from '../hooks/pages/useTrainingCyclePageData'
import { triggerHaptic } from '../lib/haptics'
import { getTemplateColor } from '../lib/template-color'
import type { TrainingCycleSlot } from '../models/types'

export function TrainingCyclePage() {
  const {
    error,
    handleAddSlot,
    handleAssignTemplate,
    handleCalibrateToday,
    handleRemoveSlot,
    handleReorderSlots,
    isLoading,
    isSubmitting,
    templates,
    todayCycleDay,
    trainingCycle,
  } = useTrainingCyclePageData()
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [slotOrder, setSlotOrder] = useState<string[] | null>(null)
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)
  const [isSorting, setIsSorting] = useState(false)

  useEffect(() => {
    if (!trainingCycle || trainingCycle.slots.length === 0) {
      setSheetOpen(false)
    }
  }, [trainingCycle])

  const templateColorMap = useMemo(
    () => new Map(templates.map((template, index) => [template.id, getTemplateColor(index)])),
    [templates],
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
  const selectedTemplate = selectedSlot?.templateId
    ? templates.find((template) => template.id === selectedSlot.templateId) ?? null
    : null

  const orderedAnchorIndex =
    todayCycleDay === null
      ? trainingCycle?.anchorIndex ?? 0
      : Math.max(
          0,
          orderedSlots.findIndex((slot) => slot.id === todayCycleDay.slot.id),
        )

  const orderedSlotItems = useMemo(() => {
    return orderedSlots.map<TrainingCycleSlotListItem>((slot, index) => {
      const template = slot.templateId
        ? templates.find((item) => item.id === slot.templateId) ?? null
        : null
      const color = template ? templateColorMap.get(template.id) ?? null : null
      const isToday = todayCycleDay?.slot.id === slot.id
      const slotDateKey = trainingCycle
        ? getCycleSlotDateKey(trainingCycle.anchorDateKey, orderedAnchorIndex, index)
        : ''

      return {
        color,
        index,
        isToday,
        slot,
        template,
        weekdayLabel: slotDateKey ? getWeekdayLabel(slotDateKey) : '',
      }
    })
  }, [orderedAnchorIndex, orderedSlots, templateColorMap, templates, todayCycleDay, trainingCycle])
  const activeSlotItem =
    activeSlotId === null
      ? null
      : orderedSlotItems.find((item) => item.slot.id === activeSlotId) ?? null

  async function assignTemplate(templateId: string | null) {
    if (!selectedSlot) return
    await handleAssignTemplate(selectedSlot.id, templateId)
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
    void triggerHaptic('selection-start')
  }

  function handleDragCancel() {
    setActiveSlotId(null)
    setIsSorting(false)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    setActiveSlotId(null)
    setIsSorting(false)

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

      void triggerHaptic('selection-end')
    })
  }

  return (
    <div className="flex h-[calc(100vh-5rem-env(safe-area-inset-bottom))] min-h-0 flex-col bg-[var(--surface)]">
      <PageHeader
        title="循环日程"
        subtitle={`当前循环：${trainingCycle?.slots.length || 0} 天`}
        backFallbackTo="/templates"
      />

      {!isLoading && trainingCycle && trainingCycle.slots.length > 0 ? (
        <div className="mx-4 mt-1 rounded-full bg-[var(--surface-container)] px-3 py-2 text-center text-[12px] font-medium text-[var(--on-surface-variant)]">
          点击左侧序号可设为今天 · 长按拖动排序
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
        onAssignTemplate={(templateId) => void assignTemplate(templateId)}
        onClose={() => setSheetOpen(false)}
        onDeleteSlot={(slotId) => void deleteSlot(slotId)}
        open={sheetOpen}
        selectedIndex={selectedIndex}
        selectedSlotId={selectedSlotId}
        selectedTemplate={selectedTemplate}
        templateColorMap={templateColorMap}
        templates={templates}
      />
    </div>
  )
}
