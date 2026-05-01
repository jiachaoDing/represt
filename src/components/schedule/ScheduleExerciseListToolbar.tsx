import { useTranslation } from 'react-i18next'
import { BookmarkPlus, ListChecks, ListX, Pencil } from 'lucide-react'

type ScheduleExerciseListToolbarProps = {
  isEditMode: boolean
  isSelectionMode: boolean
  selectedCount: number
  isAllSelected: boolean
  selectableExerciseIds: string[]
  selectableCount: number
  isSubmitting: boolean
  onCancelEdit: () => void
  onOpenEdit: () => void
  onOpenSelection: () => void
  onCloseSelection: () => void
  onToggleAllSelected: (exerciseIds: string[]) => void
  onDeleteSelected: () => void
  onSaveTemplate: () => void
}

export function ScheduleExerciseListToolbar({
  isEditMode,
  isSelectionMode,
  selectedCount,
  isAllSelected,
  selectableExerciseIds,
  selectableCount,
  isSubmitting,
  onCancelEdit,
  onOpenEdit,
  onOpenSelection,
  onCloseSelection,
  onToggleAllSelected,
  onDeleteSelected,
  onSaveTemplate,
}: ScheduleExerciseListToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className="-mb-1 flex items-center justify-between px-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="whitespace-nowrap text-[12px] text-[var(--on-surface-variant)]">
          {isEditMode
            ? t('schedule.editExercises')
            : isSelectionMode
            ? t('schedule.selectedDeletableCount', { count: selectedCount })
            : t('templates.longPressSort')}
        </span>
        {isSelectionMode ? (
          <button
            type="button"
            onClick={() => onToggleAllSelected(isAllSelected ? [] : selectableExerciseIds)}
            className="flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
            aria-label={isAllSelected ? t('templates.clearAll') : t('templates.selectAll')}
          >
            {isAllSelected ? (
              <ListX size={16} strokeWidth={2.25} />
            ) : (
              <ListChecks size={16} strokeWidth={2.25} />
            )}
            <span>{isAllSelected ? t('templates.clearAll') : t('templates.selectAll')}</span>
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        {isEditMode ? (
          <button
            type="button"
            onClick={onCancelEdit}
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
              onClick={onCloseSelection}
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
              disabled={selectedCount === 0 || isSubmitting}
              onClick={onDeleteSelected}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--error)] transition-colors hover:bg-[var(--error)]/10 disabled:opacity-40"
              aria-label={t('common.delete')}
            >
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </>
        ) : selectableCount > 0 ? (
          <button
            type="button"
            onClick={onOpenSelection}
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
            onClick={onOpenEdit}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
            aria-label={t('schedule.editExercises')}
          >
            <Pencil size={18} strokeWidth={2.25} />
          </button>
        ) : null}
        {!isSelectionMode && !isEditMode ? (
          <button
            type="button"
            onClick={onSaveTemplate}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
            aria-label={t('schedule.saveTodayAsTemplate')}
          >
            <BookmarkPlus size={18} strokeWidth={2.25} />
          </button>
        ) : null}
      </div>
    </div>
  )
}
