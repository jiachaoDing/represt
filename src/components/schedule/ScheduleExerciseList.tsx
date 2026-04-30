import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { Pencil } from 'lucide-react'
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
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'

import type { WorkoutSessionWithExercises } from '../../db/sessions'
import {
  verticalSortDropAnimation,
  verticalSortModifiers,
} from '../dnd/vertical-sortable-motion'
import { triggerHaptic } from '../../lib/haptics'
import { ScheduleExerciseCard } from './ScheduleExerciseCard'
import { SortableScheduleExerciseItem } from './SortableScheduleExerciseItem'
import { TemplateExerciseInlineEditor } from '../templates/TemplateExerciseInlineEditor'
import { toTemplateExerciseDraft, type TemplateExerciseDraft } from '../../lib/template-editor'
import { getDisplayExerciseName } from '../../lib/exercise-name'

type ScheduleExerciseListProps = {
  currentSession: WorkoutSessionWithExercises | null
  hasTemplates: boolean
  isLoading: boolean
  isSubmitting: boolean
  now: number
  onOpenAdd: () => void
  onDeleteSelected: (exerciseIds: string[]) => Promise<boolean>
  onEditExercise: (exerciseId: string, draft: TemplateExerciseDraft) => Promise<boolean>
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
  onEditExercise,
  onReorder,
}: ScheduleExerciseListProps) {
  const { t } = useTranslation()
  const [exerciseOrder, setExerciseOrder] = useState<string[] | null>(null)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [isSorting, setIsSorting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editExerciseId, setEditExerciseId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<TemplateExerciseDraft | null>(null)
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
    setEditDraft(toTemplateExerciseDraft({
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
          {hasTemplates ? t('schedule.addExercise') : t('schedule.newExercise')}
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
        <div className={`text-[12px] text-[var(--on-surface-variant)] ${isSelectionMode ? 'whitespace-nowrap' : ''}`}>
          {isEditMode
            ? t('schedule.editExercises')
            : isSelectionMode
            ? t('schedule.selectedDeletableCount', { count: selectedExerciseIds.length })
            : t('templates.longPressSort')}
        </div>
        <div className="flex items-center gap-1">
          {isEditMode ? (
            <button
              type="button"
              onClick={closeEditMode}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--on-surface-variant)]/10"
              aria-label={t('common.cancel')}
            >
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          ) : isSelectionMode ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedExerciseIds(isAllSelected ? [] : deletableExerciseIds)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
                aria-label={isAllSelected ? t('templates.clearAll') : t('templates.selectAll')}
              >
                {isAllSelected ? (
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M8 12h8" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m9 12 2 2 4-5" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={closeSelectionMode}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--on-surface-variant)]/10"
                aria-label={t('common.cancel')}
              >
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
              <button
                type="button"
                disabled={selectedExerciseIds.length === 0 || isSubmitting}
                onClick={() => void deleteSelectedExercises()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--error)] transition-colors hover:bg-[var(--error)]/10 disabled:opacity-40"
                aria-label={t('common.delete')}
              >
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </>
          ) : deletableCount > 0 ? (
            <button
              type="button"
              onClick={openSelectionMode}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--error)] transition-colors hover:bg-[var(--error)]/10"
              aria-label={t('templates.bulkDeleteExercise')}
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
          {!isSelectionMode && !isEditMode ? (
            <button
              type="button"
              onClick={openEditMode}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
              aria-label={t('schedule.editExercises')}
            >
              <Pencil size={18} strokeWidth={2.25} />
            </button>
          ) : null}
          {!isSelectionMode && !isEditMode ? (
            <button
              type="button"
              onClick={onOpenAdd}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
              aria-label={hasTemplates ? t('schedule.addExercise') : t('schedule.newExercise')}
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
                  <TemplateExerciseInlineEditor
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
