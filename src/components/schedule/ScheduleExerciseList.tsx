import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { BookmarkPlus } from 'lucide-react'
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
  initialEditExerciseId: string | null
  isLoading: boolean
  isSubmitting: boolean
  now: number
  showSavePlanTip: boolean
  onOpenAdd: () => void
  onOpenSavePlan: () => void
  onDismissSavePlanTip: () => void
  onDeleteSelected: (exerciseIds: string[]) => Promise<boolean>
  onEditExercise: (exerciseId: string, draft: PlanExerciseDraft) => Promise<boolean>
  onInitialEditHandled: () => void
  onReorder: (orderedExerciseIds: string[]) => Promise<boolean>
}

export function ScheduleExerciseList({
  currentSession,
  hasPlans,
  initialEditExerciseId,
  isLoading,
  isSubmitting,
  now,
  showSavePlanTip,
  onOpenAdd,
  onOpenSavePlan,
  onDismissSavePlanTip,
  onDeleteSelected,
  onEditExercise,
  onInitialEditHandled,
  onReorder,
}: ScheduleExerciseListProps) {
  const { t } = useTranslation()
  const [exerciseOrder, setExerciseOrder] = useState<string[] | null>(null)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [isSorting, setIsSorting] = useState(false)
  const [editExerciseId, setEditExerciseId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<PlanExerciseDraft | null>(null)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([])
  const lastDragOverIdRef = useRef<string | null>(null)
  const itemRefs = useRef(new Map<string, HTMLDivElement>())
  const editStateRef = useRef<{ draft: PlanExerciseDraft | null; exerciseId: string | null }>({
    draft: null,
    exerciseId: null,
  })

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

  useEffect(() => {
    editStateRef.current = { draft: editDraft, exerciseId: editExerciseId }
  }, [editDraft, editExerciseId])

  const closeSelectionMode = useCallback(() => {
    setSelectedExerciseIds([])
    setIsSelectionMode(false)
  }, [])

  const clearExerciseEditor = useCallback((exerciseId: string) => {
    setEditExerciseId((current) => (current === exerciseId ? null : current))
    setEditDraft((current) =>
      editStateRef.current.exerciseId === exerciseId ? null : current,
    )
  }, [])

  function cancelCurrentExerciseEdit() {
    const exerciseId = editStateRef.current.exerciseId
    if (!exerciseId) {
      return
    }

    clearExerciseEditor(exerciseId)
  }

  const saveCurrentExerciseEdit = useCallback(async () => {
    const exerciseId = editStateRef.current.exerciseId
    const draft = editStateRef.current.draft
    if (!exerciseId || !draft) {
      return true
    }

    if (!draft.name.trim()) {
      return false
    }

    const didEdit = await onEditExercise(exerciseId, draft)
    if (didEdit) {
      clearExerciseEditor(exerciseId)
    }

    return didEdit
  }, [clearExerciseEditor, onEditExercise])

  const closeEditMode = useCallback(async () => {
    await saveCurrentExerciseEdit()
    setEditExerciseId(null)
    setEditDraft(null)
  }, [saveCurrentExerciseEdit])

  function openSelectionMode() {
    void closeEditMode()
    setSelectedExerciseIds([])
    setIsSelectionMode(true)
  }

  const openExerciseEditor = useCallback((exerciseId: string) => {
    const exercise = orderedExercises.find((item) => item.id === exerciseId)
    if (!exercise) {
      return false
    }

    if (exercise.completedSets > 0) {
      return false
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
    return true
  }, [orderedExercises, t])

  async function switchExerciseEditor(exerciseId: string) {
    if (editStateRef.current.exerciseId === exerciseId) {
      return
    }

    const didSave = await saveCurrentExerciseEdit()
    if (didSave) {
      openExerciseEditor(exerciseId)
    }
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
    if (!editExerciseId || !editDraft || !editDraft.name.trim()) {
      return
    }

    const didEdit = await onEditExercise(editExerciseId, editDraft)
    if (didEdit) {
      clearExerciseEditor(editExerciseId)
    }
  }

  useEffect(() => {
    if (!initialEditExerciseId || orderedExercises.length === 0) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      closeSelectionMode()
      if (openExerciseEditor(initialEditExerciseId)) {
        onInitialEditHandled()
        const element = itemRefs.current.get(initialEditExerciseId)
        element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [
    closeSelectionMode,
    initialEditExerciseId,
    onInitialEditHandled,
    openExerciseEditor,
    orderedExercises.length,
  ])

  useEffect(() => {
    if (!editExerciseId) {
      return
    }

    const activeEditExerciseId = editExerciseId
    function handlePointerDown(event: PointerEvent) {
      const editorElement = itemRefs.current.get(activeEditExerciseId)
      if (!editorElement || !(event.target instanceof Node)) {
        return
      }

      if (!editorElement.contains(event.target)) {
        void saveCurrentExerciseEdit()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [editExerciseId, saveCurrentExerciseEdit])

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
        isSelectionMode={isSelectionMode}
        selectedCount={selectedExerciseIds.length}
        isAllSelected={isAllSelected}
        selectableExerciseIds={deletableExerciseIds}
        selectableCount={deletableCount}
        isSubmitting={isSubmitting}
        onOpenSelection={openSelectionMode}
        onCloseSelection={closeSelectionMode}
        onToggleAllSelected={setSelectedExerciseIds}
        onDeleteSelected={() => void deleteSelectedExercises()}
        onSavePlan={onOpenSavePlan}
      />

      {showSavePlanTip ? (
        <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-container)]/30 px-4 py-3">
          <p className="inline-flex flex-wrap items-center gap-1 text-sm leading-5 text-[var(--on-surface)]">
            <span>{t('schedule.saveTodayAsPlanTipPrefix')}</span>
            <BookmarkPlus
              size={17}
              strokeWidth={2.25}
              aria-label={t('schedule.saveTodayAsPlan')}
              className="text-[var(--primary)]"
            />
            <span>{t('schedule.saveTodayAsPlanTipSuffix')}</span>
          </p>
          <button
            type="button"
            onClick={onDismissSavePlanTip}
            className="mt-2 text-sm font-medium text-[var(--primary)]"
          >
            {t('schedule.dontShowAgain')}
          </button>
        </div>
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
          <div className="flex flex-col gap-3">
            {orderedExercises.map((exercise, index) => (
              <div
                key={exercise.id}
                ref={(element) => {
                  if (element) {
                    itemRefs.current.set(exercise.id, element)
                    return
                  }

                  itemRefs.current.delete(exercise.id)
                }}
              >
                {editExerciseId === exercise.id && editDraft ? (
                  <PlanExerciseInlineEditor
                    draft={editDraft}
                    isEditing
                    isSubmitting={isSubmitting}
                    onCancel={cancelCurrentExerciseEdit}
                    onDraftChange={setEditDraft}
                    onSubmit={submitExerciseEdit}
                  />
                ) : (
                  <SortableScheduleExerciseItem
                    exercise={exercise}
                    isSelected={selectedExerciseIds.includes(exercise.id)}
                    index={index}
                    isSelectionMode={isSelectionMode}
                    isSorting={isSorting}
                    isSubmitting={isSubmitting}
                    now={now}
                    onEdit={(exerciseId) => void switchExerciseEditor(exerciseId)}
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
