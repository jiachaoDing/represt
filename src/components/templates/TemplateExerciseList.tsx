import { useMemo, useRef, useState } from 'react'
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
import { SortableTemplateExerciseItem } from './SortableTemplateExerciseItem'
import { TemplateExerciseDragOverlay } from './TemplateExerciseDragOverlay'
import { TemplateExerciseInlineEditor } from './TemplateExerciseInlineEditor'
import type { TemplateExerciseListProps } from './template-exercise-list.types'
import { getOrderedExercises, getReorderedExerciseIds } from './template-exercise-list.utils'
import { useScrollToPendingExercise } from './useScrollToPendingExercise'
import { triggerHaptic } from '../../lib/haptics'

export function TemplateExerciseList({
  currentTemplate,
  draft,
  editExerciseId,
  isCreatingExercise,
  isLoading,
  isSubmitting,
  pendingScrollExerciseId,
  templatesCount,
  onCancelEditing,
  onCreate,
  onDeleteSelected,
  onDraftChange,
  onEdit,
  onReorder,
  onScrollAnimationComplete,
  onSubmit,
}: TemplateExerciseListProps) {
  const [exerciseOrder, setExerciseOrder] = useState<string[] | null>(null)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [isSorting, setIsSorting] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([])
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
    return getOrderedExercises(currentTemplate?.exercises ?? [], exerciseOrder)
  }, [currentTemplate, exerciseOrder])

  const activeExercise =
    activeExerciseId === null
      ? null
      : orderedExercises.find((exercise) => exercise.id === activeExerciseId) ?? null
  const activeExerciseIndex =
    activeExercise === null
      ? -1
      : orderedExercises.findIndex((exercise) => exercise.id === activeExercise.id)
  const exerciseIds = orderedExercises.map((exercise) => exercise.id)
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

    if (!currentTemplate || !over || active.id === over.id) {
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
        setExerciseOrder(currentTemplate.exercises.map((exercise) => exercise.id))
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

  function toggleSelectedExercise(exerciseId: string) {
    setSelectedExerciseIds((current) =>
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

  if (templatesCount === 0) {
    return (
      <div className="mx-4 mt-6 rounded-xl border border-dashed border-[var(--outline)] px-5 py-8 text-center">
        <p className="text-sm font-medium text-[var(--on-surface-variant)]">还没有模板</p>
      </div>
    )
  }

  if (!currentTemplate) {
    return null
  }

  const shouldShowEmptyHint = orderedExercises.length === 0 && !isCreatingExercise

  return (
    <div className="mt-4 px-4">
      {shouldShowEmptyHint ? (
        <div className="rounded-xl border border-dashed border-[var(--outline)] px-5 py-8 text-center">
          <p className="text-sm font-medium text-[var(--on-surface-variant)]">这个模板还没有动作</p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-4 inline-flex items-center text-sm font-medium text-[var(--primary)]"
          >
            添加动作
          </button>
        </div>
      ) : null}

      {!shouldShowEmptyHint ? (
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="text-[12px] text-[var(--on-surface-variant)]">
            {isSelectionMode ? `已选择 ${selectedExerciseIds.length} 个` : '长按拖动排序'}
          </div>
          <div className="flex items-center gap-1">
            {isSelectionMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedExerciseIds(isAllSelected ? [] : exerciseIds)}
                  className="rounded-full px-3 py-2 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
                >
                  {isAllSelected ? '取消全选' : '全选'}
                </button>
                <button
                  type="button"
                  onClick={closeSelectionMode}
                  className="rounded-full px-3 py-2 text-xs font-medium text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--on-surface-variant)]/10"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={selectedExerciseIds.length === 0 || isSubmitting}
                  onClick={() => void deleteSelectedExercises()}
                  className="rounded-full px-3 py-2 text-xs font-medium text-[var(--error)] transition-colors hover:bg-[var(--error)]/10 disabled:opacity-40"
                >
                  删除
                </button>
              </>
            ) : orderedExercises.length > 0 ? (
              <button
                type="button"
                onClick={openSelectionMode}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--error)] transition-colors hover:bg-[var(--error)]/10"
                aria-label="批量删除动作"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="19"
                  height="19"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            ) : null}
            {!isSelectionMode ? (
              <button
                type="button"
                onClick={onCreate}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
                aria-label="添加动作"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <AnimatedList className="flex flex-col gap-3">
        {isCreatingExercise && !isSelectionMode ? (
          <AnimatedListItem key="creating-exercise">
            <TemplateExerciseInlineEditor
              draft={draft}
              isEditing={false}
              isSubmitting={isSubmitting}
              onCancel={onCancelEditing}
              onDraftChange={onDraftChange}
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
                  <TemplateExerciseInlineEditor
                    draft={draft}
                    isEditing
                    isSubmitting={isSubmitting}
                    onCancel={onCancelEditing}
                    onDraftChange={onDraftChange}
                    onSubmit={onSubmit}
                  />
                ) : (
                  <SortableTemplateExerciseItem
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

          <TemplateExerciseDragOverlay
            activeExercise={activeExercise}
            activeExerciseIndex={activeExerciseIndex}
          />
        </DndContext>
      </AnimatedList>
    </div>
  )
}
