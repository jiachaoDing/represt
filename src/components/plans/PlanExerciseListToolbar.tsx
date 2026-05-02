import { ListChecks, ListX } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type PlanExerciseListToolbarProps = {
  exerciseCount: number
  isAllSelected: boolean
  isSelectionMode: boolean
  isSubmitting: boolean
  selectedExerciseCount: number
  onCancelSelection: () => void
  onCreate: () => void
  onDeleteSelected: () => void
  onOpenSelectionMode: () => void
  onToggleSelectAll: () => void
}

export function PlanExerciseListToolbar({
  exerciseCount,
  isAllSelected,
  isSelectionMode,
  isSubmitting,
  selectedExerciseCount,
  onCancelSelection,
  onCreate,
  onDeleteSelected,
  onOpenSelectionMode,
  onToggleSelectAll,
}: PlanExerciseListToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between px-2 pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="whitespace-nowrap text-[12px] text-[var(--on-surface-variant)]">
          {isSelectionMode ? t('plans.selectedCount', { count: selectedExerciseCount }) : t('plans.longPressSort')}
        </span>
        {isSelectionMode ? (
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
            aria-label={isAllSelected ? t('plans.clearAll') : t('plans.selectAll')}
          >
            {isAllSelected ? (
              <ListX size={16} strokeWidth={2.25} />
            ) : (
              <ListChecks size={16} strokeWidth={2.25} />
            )}
            <span>{isAllSelected ? t('plans.clearAll') : t('plans.selectAll')}</span>
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        {isSelectionMode ? (
          <>
            <button
              type="button"
              onClick={onCancelSelection}
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
              disabled={selectedExerciseCount === 0 || isSubmitting}
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
        ) : exerciseCount > 0 ? (
          <button
            type="button"
            onClick={onOpenSelectionMode}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--error)] transition-colors hover:bg-[var(--error)]/10"
            aria-label={t('plans.bulkDeleteExercise')}
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
            aria-label={t('plans.addExercise')}
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
  )
}
