import { useMemo, useState } from 'react'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
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
  onDelete,
  onDraftChange,
  onEdit,
  onOpenBatchDelete,
  onReorder,
  onScrollAnimationComplete,
  onSubmit,
}: TemplateExerciseListProps) {
  const [exerciseOrder, setExerciseOrder] = useState<string[] | null>(null)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [isSorting, setIsSorting] = useState(false)

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
  const { registerItemRef } = useScrollToPendingExercise({
    exerciseIds: orderedExercises.map((exercise) => exercise.id),
    pendingScrollExerciseId,
    onScrollAnimationComplete,
  })

  function handleDragStart(event: DragStartEvent) {
    setActiveExerciseId(String(event.active.id))
    setIsSorting(true)
  }

  function handleDragCancel() {
    setActiveExerciseId(null)
    setIsSorting(false)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    setActiveExerciseId(null)
    setIsSorting(false)

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
      }
    })
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
            长按后横滑删除
          </div>
          <div className="flex items-center gap-1">
            {orderedExercises.length > 0 ? (
              <button
                type="button"
                onClick={onOpenBatchDelete}
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
          </div>
        </div>
      ) : null}

      <AnimatedList className="flex flex-col gap-3">
        {isCreatingExercise ? (
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
                    index={index}
                    isSorting={isSorting}
                    isSubmitting={isSubmitting}
                    onDelete={onDelete}
                    onEdit={onEdit}
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
