import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
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

import { AnimatedList, AnimatedListItem } from '../motion/AnimatedList'
import { verticalSortModifiers } from '../dnd/vertical-sortable-motion'
import { SortablePlanExerciseItem } from './SortablePlanExerciseItem'
import { PlanExerciseDragOverlay } from './PlanExerciseDragOverlay'
import { PlanExerciseImportSheet } from './PlanExerciseImportSheet'
import { PlanExerciseInlineEditor } from './PlanExerciseInlineEditor'
import { PlanExerciseListToolbar } from './PlanExerciseListToolbar'
import type { PlanExerciseListProps } from './plan-exercise-list.types'
import { getOrderedExercises, getReorderedExerciseIds } from './plan-exercise-list.utils'
import { useScrollToPendingExercise } from './useScrollToPendingExercise'
import { triggerHaptic } from '../../lib/haptics'

export function PlanExerciseList({
  currentPlan,
  draft,
  editExerciseId,
  isCreatingExercise,
  isLoading,
  isSubmitting,
  pendingScrollExerciseId,
  plans,
  plansCount,
  onCancelEditing,
  onCreate,
  onDeleteSelected,
  onDraftChange,
  onEdit,
  onImport,
  onReorder,
  onScrollAnimationComplete,
  onSubmit,
}: PlanExerciseListProps) {
  const { t } = useTranslation()
  const [exerciseOrder, setExerciseOrder] = useState<string[] | null>(null)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [isSorting, setIsSorting] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isImportSheetOpen, setIsImportSheetOpen] = useState(false)
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([])
  const [selectedImportExerciseIds, setSelectedImportExerciseIds] = useState<string[]>([])
  const lastDragOverIdRef = useRef<string | null>(null)

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

  const orderedExercises = useMemo(() => {
    return getOrderedExercises(currentPlan?.exercises ?? [], exerciseOrder)
  }, [currentPlan, exerciseOrder])

  const activeExercise =
    activeExerciseId === null
      ? null
      : orderedExercises.find((exercise) => exercise.id === activeExerciseId) ?? null
  const activeExerciseIndex =
    activeExercise === null
      ? -1
      : orderedExercises.findIndex((exercise) => exercise.id === activeExercise.id)
  const exerciseIds = orderedExercises.map((exercise) => exercise.id)
  const sourcePlans = useMemo(
    () =>
      currentPlan
        ? plans.filter(
            (plan) => plan.id !== currentPlan.id && plan.exercises.length > 0,
          )
        : [],
    [currentPlan, plans],
  )
  const isAllSelected =
    exerciseIds.length > 0 && exerciseIds.every((exerciseId) => selectedExerciseIds.includes(exerciseId))
  const { registerItemRef } = useScrollToPendingExercise({
    exerciseIds,
    pendingScrollExerciseId,
    onScrollAnimationComplete,
  })

  function handleDragStart(event: DragStartEvent) {
    setActiveExerciseId(String(event.active.id))
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
    setActiveExerciseId(null)
    setIsSorting(false)
    lastDragOverIdRef.current = null
    void triggerHaptic('light')
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    setActiveExerciseId(null)
    setIsSorting(false)
    lastDragOverIdRef.current = null
    void triggerHaptic('light')

    if (!currentPlan || !over || active.id === over.id) {
      return
    }

    const nextOrderIds = getReorderedExerciseIds(
      orderedExercises,
      String(active.id),
      String(over.id),
    )

    if (!nextOrderIds) {
      return
    }

    setExerciseOrder(nextOrderIds)

    void onReorder(nextOrderIds).then((didReorder) => {
      if (!didReorder) {
        setExerciseOrder(currentPlan.exercises.map((exercise) => exercise.id))
        return
      }
    })
  }

  function openSelectionMode() {
    closeExerciseEditorIfNeeded()
    setSelectedExerciseIds([])
    setIsSelectionMode(true)
  }

  function closeExerciseEditorIfNeeded() {
    if (isCreatingExercise || editExerciseId !== null) {
      onCancelEditing()
    }
  }

  function closeSelectionMode() {
    setSelectedExerciseIds([])
    setIsSelectionMode(false)
  }

  function openImportSheet() {
    setSelectedImportExerciseIds([])
    setIsImportSheetOpen(true)
  }

  function closeImportSheet() {
    setSelectedImportExerciseIds([])
    setIsImportSheetOpen(false)
  }

  function toggleSelectedExercise(exerciseId: string) {
    setSelectedExerciseIds((current) =>
      current.includes(exerciseId)
        ? current.filter((selectedId) => selectedId !== exerciseId)
        : [...current, exerciseId],
    )
  }

  function toggleImportExercise(exerciseId: string) {
    setSelectedImportExerciseIds((current) =>
      current.includes(exerciseId)
        ? current.filter((selectedId) => selectedId !== exerciseId)
        : [...current, exerciseId],
    )
  }

  async function deleteSelectedExercises() {
    const didDelete = await onDeleteSelected(selectedExerciseIds)
    if (didDelete) {
      closeSelectionMode()
    }
  }

  async function importSelectedExercises() {
    const didImport = await onImport(selectedImportExerciseIds)
    if (didImport) {
      closeImportSheet()
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[4.5rem] animate-pulse border-b border-[var(--outline-variant)] bg-[var(--surface-container)] opacity-50"
          />
        ))}
      </div>
    )
  }

  if (plansCount === 0) {
    return (
      <div className="mx-4 mt-6 rounded-xl border border-dashed border-[var(--outline)] px-5 py-8 text-center">
        <p className="text-sm font-medium text-[var(--on-surface-variant)]">{t('plans.noPlans')}</p>
      </div>
    )
  }

  if (!currentPlan) {
    return null
  }

  const shouldShowEmptyHint = orderedExercises.length === 0 && !isCreatingExercise

  return (
    <div className="mt-4 px-4">
      {shouldShowEmptyHint ? (
        <div className="rounded-xl border border-dashed border-[var(--outline)] px-5 py-8 text-center">
          <p className="text-sm font-medium text-[var(--on-surface-variant)]">{t('plans.emptyPlan')}</p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-4 inline-flex items-center text-sm font-medium text-[var(--primary)]"
          >
            {t('plans.addExercise')}
          </button>
        </div>
      ) : null}

      {!shouldShowEmptyHint ? (
        <PlanExerciseListToolbar
          exerciseCount={orderedExercises.length}
          isAllSelected={isAllSelected}
          isSelectionMode={isSelectionMode}
          isSubmitting={isSubmitting}
          selectedExerciseCount={selectedExerciseIds.length}
          onCancelSelection={closeSelectionMode}
          onCreate={onCreate}
          onDeleteSelected={() => void deleteSelectedExercises()}
          onOpenSelectionMode={openSelectionMode}
          onToggleSelectAll={() => setSelectedExerciseIds(isAllSelected ? [] : exerciseIds)}
        />
      ) : null}

      <AnimatedList className="flex flex-col gap-3">
        {isCreatingExercise && !isSelectionMode ? (
          <AnimatedListItem key="creating-exercise">
            <PlanExerciseInlineEditor
              draft={draft}
              isEditing={false}
              isSubmitting={isSubmitting}
              onCancel={onCancelEditing}
              onDraftChange={onDraftChange}
              onImportClick={sourcePlans.length > 0 ? openImportSheet : undefined}
              onSubmit={onSubmit}
            />
          </AnimatedListItem>
        ) : null}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={verticalSortModifiers}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedExercises.map((exercise) => exercise.id)}
            strategy={verticalListSortingStrategy}
          >
            {orderedExercises.map((exercise, index) => (
              <div key={exercise.id}>
                {editExerciseId === exercise.id ? (
                  <PlanExerciseInlineEditor
                    draft={draft}
                    isEditing
                    isSubmitting={isSubmitting}
                    onCancel={onCancelEditing}
                    onDraftChange={onDraftChange}
                    onSubmit={onSubmit}
                  />
                ) : (
                  <SortablePlanExerciseItem
                    exercise={exercise}
                    isSelected={selectedExerciseIds.includes(exercise.id)}
                    index={index}
                    isSelectionMode={isSelectionMode}
                    isSorting={isSorting}
                    isSubmitting={isSubmitting}
                    onEdit={onEdit}
                    onToggleSelected={toggleSelectedExercise}
                    registerItemRef={registerItemRef}
                  />
                )}
              </div>
            ))}
          </SortableContext>

          <PlanExerciseDragOverlay
            activeExercise={activeExercise}
            activeExerciseIndex={activeExerciseIndex}
          />
        </DndContext>
      </AnimatedList>

      <PlanExerciseImportSheet
        isOpen={isImportSheetOpen}
        isSubmitting={isSubmitting}
        selectedExerciseIds={selectedImportExerciseIds}
        sourcePlans={sourcePlans}
        onClose={closeImportSheet}
        onSubmit={() => void importSelectedExercises()}
        onToggleExercise={toggleImportExercise}
      />
    </div>
  )
}
