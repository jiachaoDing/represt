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
import { ScheduleExerciseCard } from './ScheduleExerciseCard'
import { SortableScheduleExerciseItem } from './SortableScheduleExerciseItem'

type ScheduleExerciseListProps = {
  currentSession: WorkoutSessionWithExercises | null
  hasTemplates: boolean
  isLoading: boolean
  isSubmitting: boolean
  now: number
  onDelete: (exerciseId: string) => void
  onOpenAdd: () => void
  onReorder: (orderedExerciseIds: string[]) => Promise<boolean>
}

export function ScheduleExerciseList({
  currentSession,
  hasTemplates,
  isLoading,
  isSubmitting,
  now,
  onDelete,
  onOpenAdd,
  onReorder,
}: ScheduleExerciseListProps) {
  const [exerciseOrder, setExerciseOrder] = useState<string[] | null>(null)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [isSorting, setIsSorting] = useState(false)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 220,
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
      }
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
      <div className="-mb-1 flex justify-end px-2">
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
                  index={index}
                  isSorting={isSorting}
                  isSubmitting={isSubmitting}
                  now={now}
                  onDelete={onDelete}
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
