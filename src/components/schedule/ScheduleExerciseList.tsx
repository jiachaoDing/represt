import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
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
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import type { WorkoutSessionWithExercises } from '../../db/sessions'
import {
  verticalSortDropAnimation,
  verticalSortModifiers,
} from '../dnd/vertical-sortable-motion'
import { triggerHaptic } from '../../lib/haptics'
import { ScheduleExerciseCard } from './ScheduleExerciseCard'
import { ScheduleExerciseListToolbar } from './ScheduleExerciseListToolbar'
import { SortableScheduleExerciseItem } from './SortableScheduleExerciseItem'
import { PlanExerciseInlineEditor } from '../plans/PlanExerciseInlineEditor'
import { toPlanExerciseDraft, type PlanExerciseDraft } from '../../lib/plan-editor'
import { getDisplayExerciseName } from '../../lib/exercise-name'
import {
  getOrderedScheduleExercises,
  getReorderedScheduleExerciseIds,
} from './schedule-exercise-list.utils'

type ScheduleExerciseListProps = {
  currentSession: WorkoutSessionWithExercises | null
  hasPlans: boolean
  isLoading: boolean
  isSubmitting: boolean
  now: number
  onOpenAdd: () => void
  onOpenSavePlan: () => void
  onDeleteSelected: (exerciseIds: string[]) => Promise<boolean>
  onEditExercise: (exerciseId: string, draft: PlanExerciseDraft) => Promise<boolean>
  onReorder: (orderedExerciseIds: string[]) => Promise<boolean>
}

export function ScheduleExerciseList({
  currentSession,
  hasPlans,
  isLoading,
  isSubmitting,
  now,
  onOpenAdd,
  onOpenSavePlan,
  onDeleteSelected,
  onEditExercise,
  onReorder,
}: ScheduleExerciseListProps) {
  const { t } = useTranslation()
  const [exerciseOrder, setExerciseOrder] = useState<string[] | null>(null)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [isSorting, setIsSorting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editExerciseId, setEditExerciseId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<PlanExerciseDraft | null>(null)
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
    const exercises = currentSession?.exercises ?? []
    return getOrderedScheduleExercises(exercises, exerciseOrder)
  }, [currentSession, exerciseOrder])

  const activeExercise =
    activeExerciseId === null
      ? null
      : orderedExercises.find((exercise) => exercise.id === activeExerciseId) ?? null
  const activeExerciseIndex =
    activeExercise === null
      ? -1
      : orderedExercises.findIndex((exercise) => exercise.id === activeExercise.id)
  const deletableCount = orderedExercises.length
  const deletableExerciseIds = orderedExercises.map((exercise) => exercise.id)
  const isAllSelected =
    deletableExerciseIds.length > 0 &&
    deletableExerciseIds.every((exerciseId) => selectedExerciseIds.includes(exerciseId))

  function openSelectionMode() {
    closeEditMode()
    setSelectedExerciseIds([])
    setIsSelectionMode(true)
  }

  function closeSelectionMode() {
    setSelectedExerciseIds([])
    setIsSelectionMode(false)
  }

  function openEditMode() {
    closeSelectionMode()
    setIsEditMode(true)
  }

  function closeEditMode() {
    setIsEditMode(false)
    setEditExerciseId(null)
    setEditDraft(null)
  }

  function openExerciseEditor(exerciseId: string) {
    const exercise = orderedExercises.find((item) => item.id === exerciseId)
    if (!exercise) {
      return
    }

    setEditExerciseId(exercise.id)
    setEditDraft(toPlanExerciseDraft({
      ...exercise,
      name: getDisplayExerciseName(t, exercise),
      weightKg: exercise.defaultWeightKg ?? null,
      reps: exercise.defaultReps ?? null,
      durationSeconds: exercise.defaultDurationSeconds ?? null,
      distanceMeters: exercise.defaultDistanceMeters ?? null,
    }))
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

  async function submitExerciseEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editExerciseId || !editDraft) {
      return
    }

    const didEdit = await onEditExercise(editExerciseId, editDraft)
    if (didEdit) {
      closeEditMode()
    }
  }

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

    if (!currentSession || !over) {
      return
    }

    const nextOrderIds = getReorderedScheduleExerciseIds(
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
        setExerciseOrder(currentSession.exercises.map((exercise) => exercise.id))
        return
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
      <div className="mx-4 rounded-2xl border border-dashed border-[var(--outline)] px-5 py-8 text-center">
        <p className="text-sm font-medium text-[var(--on-surface-variant)]">{t('schedule.noExercisesToday')}</p>
        <button
          type="button"
          onClick={onOpenAdd}
          className="mt-4 text-sm font-medium text-[var(--primary)]"
        >
          {hasPlans ? t('schedule.addExercise') : t('schedule.newExercise')}
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
      <ScheduleExerciseListToolbar
        isEditMode={isEditMode}
        isSelectionMode={isSelectionMode}
        selectedCount={selectedExerciseIds.length}
        isAllSelected={isAllSelected}
        selectableExerciseIds={deletableExerciseIds}
        selectableCount={deletableCount}
        isSubmitting={isSubmitting}
        onCancelEdit={closeEditMode}
        onOpenEdit={openEditMode}
        onOpenSelection={openSelectionMode}
        onCloseSelection={closeSelectionMode}
        onToggleAllSelected={setSelectedExerciseIds}
        onDeleteSelected={() => void deleteSelectedExercises()}
        onSavePlan={onOpenSavePlan}
      />

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
          <div className="flex flex-col gap-3">
            {orderedExercises.map((exercise, index) => (
              <div key={exercise.id}>
                {editExerciseId === exercise.id && editDraft ? (
                  <PlanExerciseInlineEditor
                    draft={editDraft}
                    isEditing
                    isSubmitting={isSubmitting}
                    onCancel={closeEditMode}
                    onDraftChange={setEditDraft}
                    onSubmit={submitExerciseEdit}
                  />
                ) : (
                  <SortableScheduleExerciseItem
                    exercise={exercise}
                    isSelected={selectedExerciseIds.includes(exercise.id)}
                    isEditMode={isEditMode}
                    index={index}
                    isSelectionMode={isSelectionMode}
                    isSorting={isSorting}
                    isSubmitting={isSubmitting}
                    now={now}
                    onEdit={openExerciseEditor}
                    onToggleSelected={toggleSelectedExercise}
                  />
                )}
              </div>
            ))}
          </div>
        </SortableContext>

        {dragOverlay}
      </DndContext>
    </div>
  )
}
