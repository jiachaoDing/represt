import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'

import type { WorkoutSessionWithExercises } from '../../db/sessions'
import {
  verticalSortDropAnimation,
  verticalSortModifiers,
} from '../dnd/vertical-sortable-motion'
import { triggerHaptic } from '../../lib/haptics'
import { ScheduleExerciseCard } from './ScheduleExerciseCard'
import { SortableScheduleExerciseItem } from './SortableScheduleExerciseItem'

type ScheduleExerciseListProps = {
  currentSession: WorkoutSessionWithExercises | null
  hasTemplates: boolean
  isLoading: boolean
  isSubmitting: boolean
  now: number
  onOpenAdd: () => void
  onDeleteSelected: (exerciseIds: string[]) => Promise<boolean>
  onReorder: (orderedExerciseIds: string[]) => Promise<boolean>
}

export function ScheduleExerciseList({
  currentSession,
  hasTemplates,
  isLoading,
  isSubmitting,
  now,
  onOpenAdd,
  onDeleteSelected,
  onReorder,
}: ScheduleExerciseListProps) {
  const [exerciseOrder, setExerciseOrder] = useState<string[] | null>(null)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [isSorting, setIsSorting] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([])

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
    const exercises = currentSession?.exercises ?? []
    if (!exerciseOrder || exerciseOrder.length !== exercises.length) {
      return exercises
    }

    const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]))
    const nextExercises = exerciseOrder
      .map((exerciseId) => exerciseMap.get(exerciseId) ?? null)
      .filter((exercise): exercise is WorkoutSessionWithExercises['exercises'][number] => exercise !== null)

    return nextExercises.length === exercises.length ? nextExercises : exercises
  }, [currentSession, exerciseOrder])

  const activeExercise =
    activeExerciseId === null
      ? null
      : orderedExercises.find((exercise) => exercise.id === activeExerciseId) ?? null
  const activeExerciseIndex =
    activeExercise === null
      ? -1
      : orderedExercises.findIndex((exercise) => exercise.id === activeExercise.id)
  const deletableCount = orderedExercises.filter(
    (exercise) => exercise.status === 'pending' && exercise.completedSets === 0,
  ).length
  const deletableExerciseIds = orderedExercises
    .filter((exercise) => exercise.status === 'pending' && exercise.completedSets === 0)
    .map((exercise) => exercise.id)
  const isAllSelected =
    deletableExerciseIds.length > 0 &&
    deletableExerciseIds.every((exerciseId) => selectedExerciseIds.includes(exerciseId))

  function openSelectionMode() {
    setSelectedExerciseIds([])
    setIsSelectionMode(true)
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

  function handleDragStart(event: DragStartEvent) {
    setActiveExerciseId(String(event.active.id))
    setIsSorting(true)
    void triggerHaptic('selection-start')
  }

  function handleDragCancel() {
    setActiveExerciseId(null)
    setIsSorting(false)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    setActiveExerciseId(null)
    setIsSorting(false)

    if (!currentSession || !over || active.id === over.id) {
      return
    }

    const oldIndex = orderedExercises.findIndex((exercise) => exercise.id === active.id)
    const newIndex = orderedExercises.findIndex((exercise) => exercise.id === over.id)

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return
    }

    const nextOrderIds = arrayMove(orderedExercises, oldIndex, newIndex).map(
      (exercise) => exercise.id,
    )

    setExerciseOrder(nextOrderIds)

    void onReorder(nextOrderIds).then((didReorder) => {
      if (!didReorder) {
        setExerciseOrder(currentSession.exercises.map((exercise) => exercise.id))
        return
      }

      void triggerHaptic('selection-end')
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-3 px-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[5rem] animate-pulse rounded-2xl bg-[var(--surface-container)] opacity-50"
          />
        ))}
      </div>
    )
  }

  if (!currentSession || currentSession.exercises.length === 0) {
    return (
      <div className="mx-4 rounded-2xl border border-dashed border-[var(--outline)] px-5 py-10 text-center">
        <p className="text-sm font-medium text-[var(--on-surface-variant)]">今天还没有动作</p>
        <button
          type="button"
          onClick={onOpenAdd}
          className="mt-4 text-sm font-medium text-[var(--primary)]"
        >
          {hasTemplates ? '添加动作' : '新建动作'}
        </button>
      </div>
    )
  }

  const dragOverlay = createPortal(
    <DragOverlay
      adjustScale={false}
      dropAnimation={verticalSortDropAnimation}
      modifiers={verticalSortModifiers}
    >
      {activeExercise ? (
        <div className="opacity-95">
          <ScheduleExerciseCard
            exercise={activeExercise}
            index={activeExerciseIndex}
            isDragging
            isSubmitting
            now={now}
          />
        </div>
      ) : null}
    </DragOverlay>,
    document.body,
  )

  return (
    <div className="flex flex-col gap-3 px-4">
      <div className="-mb-1 flex items-center justify-between px-2">
        <div className="text-[12px] text-[var(--on-surface-variant)]">
          {isSelectionMode
            ? `已选择 ${selectedExerciseIds.length} 个 · 仅未开始可删除`
            : '长按拖动排序'}
        </div>
        <div className="flex items-center gap-1">
          {isSelectionMode ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedExerciseIds(isAllSelected ? [] : deletableExerciseIds)}
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
          ) : deletableCount > 0 ? (
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
              onClick={onOpenAdd}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
              aria-label={hasTemplates ? '添加动作' : '新建动作'}
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
          <div className="flex flex-col gap-3">
            {orderedExercises.map((exercise, index) => (
              <div key={exercise.id}>
                <SortableScheduleExerciseItem
                  exercise={exercise}
                  isSelected={selectedExerciseIds.includes(exercise.id)}
                  index={index}
                  isSelectionMode={isSelectionMode}
                  isSorting={isSorting}
                  isSubmitting={isSubmitting}
                  now={now}
                  onToggleSelected={toggleSelectedExercise}
                />
              </div>
            ))}
          </div>
        </SortableContext>

        {dragOverlay}
      </DndContext>
    </div>
  )
}
