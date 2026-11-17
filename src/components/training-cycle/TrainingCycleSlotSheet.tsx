import { useLayoutEffect, useRef, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { BottomSheet } from '../ui/BottomSheet'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { PlanNameSheet } from '../plans/PlanNameSheet'
import { PlanTemplateChip } from '../plans/PlanTemplateChip'
import type { PlanWithExercises } from '../../db/plans'
import { getDisplayExerciseName } from '../../lib/exercise-name'
import { getTemplateColor, restDayColor } from '../../lib/plan-color'

type TrainingCycleSlotSheetProps = {
  error: string | null
  isSubmitting: boolean
  onAssignPlan: (planId: string | null) => Promise<boolean>
  onCreatePlan: (name: string) => Promise<string | null>
  onPlansImported: () => Promise<boolean>
  onClose: () => void
  onDeleteSlot: (slotId: string | null) => Promise<boolean>
  open: boolean
  selectedIndex: number
  selectedSlotId: string | null
  selectedPlan: PlanWithExercises | null
  plans: PlanWithExercises[]
}

export function TrainingCycleSlotSheet({
  error,
  isSubmitting,
  onAssignPlan,
  onCreatePlan,
  onPlansImported,
  onClose,
  onDeleteSlot,
  open,
  selectedIndex,
  selectedSlotId,
  selectedPlan,
  plans,
}: TrainingCycleSlotSheetProps) {
  const { t } = useTranslation()
  const [candidateId, setCandidateId] = useState(selectedPlan?.id ?? null)
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)
  const pendingRef = useRef(false)
  const candidate = plans.find((plan) => plan.id === candidateId) ?? null
  const unchanged = candidateId === (selectedPlan?.id ?? null)
  const missingCandidate = candidateId !== null && candidate === null
  const exercises = candidate?.exercises ?? []
  const sheetVisible = open && !creating && !confirmDelete

  useLayoutEffect(() => {
    const container = scrollRef.current
    const selected = selectedRef.current
    if (!sheetVisible || !container || !selected) return
    const containerRect = container.getBoundingClientRect()
    const selectedRect = selected.getBoundingClientRect()
    container.scrollLeft += selectedRect.left - containerRect.left - (containerRect.width - selectedRect.width) / 2
  }, [candidateId, plans.length, sheetVisible])

  async function applyPlan() {
    if (pendingRef.current || isSubmitting || unchanged || missingCandidate) return
    pendingRef.current = true
    try {
      if (await onAssignPlan(candidateId)) onClose()
    } finally {
      pendingRef.current = false
    }
  }

  async function deleteDay() {
    if (pendingRef.current || isSubmitting) return
    pendingRef.current = true
    try {
      if (await onDeleteSlot(selectedSlotId)) onClose()
      setConfirmDelete(false)
    } finally {
      pendingRef.current = false
    }
  }

  return (
    <>
      <BottomSheet
        open={sheetVisible}
        onClose={() => {
          if (!isSubmitting) onClose()
        }}
        variant="compact"
        title={t('trainingCycle.dayNumber', { dayNumber: selectedIndex + 1 })}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isSubmitting}
              className="flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-[var(--error)] transition-colors hover:bg-[var(--error-container)] disabled:opacity-40"
            >
              <Trash2 size={17} aria-hidden="true" />
              {t('trainingCycle.deleteDay')}
            </button>
            <button
              type="button"
              onClick={() => void applyPlan()}
              disabled={isSubmitting || unchanged || missingCandidate}
              className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-[var(--on-primary)] disabled:bg-[var(--surface-container-high)] disabled:text-[var(--on-surface-variant)]"
            >
              {unchanged ? <Check size={17} className="shrink-0" aria-hidden="true" /> : null}
              {t(unchanged ? 'trainingCycle.alreadySelected' : 'trainingCycle.applyPlan')}
            </button>
          </div>
        }
      >
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <div ref={scrollRef} className="scrollbar-hide min-w-0 flex-1 overflow-x-auto overscroll-x-contain" data-primary-tab-swipe-lock="true">
            <div role="group" aria-label={t('trainingCycle.selectPlan')} className="flex w-max items-center gap-2 py-1">
              {[null, ...plans].map((plan) => {
                const id = plan?.id ?? null
                const name = plan?.name ?? t('trainingCycle.restDay')
                const active = candidateId === id
                return (
                  <PlanTemplateChip
                    key={id ?? 'rest'}
                    ref={active ? selectedRef : undefined}
                    selected={active}
                    color={plan ? getTemplateColor(plan) : restDayColor}
                    disabled={isSubmitting}
                    title={name}
                    aria-label={name}
                    onClick={() => {
                      setCandidateId(id)
                    }}
                    className="max-w-[11rem]"
                  >
                    <span className="truncate">{name}</span>
                  </PlanTemplateChip>
                )
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={isSubmitting}
            aria-label={t('plans.newPlan')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--primary)] transition-colors hover:bg-[var(--primary-container)] disabled:opacity-40"
          >
            <Plus size={22} aria-hidden="true" />
          </button>
        </div>

        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain py-4" aria-live="polite">
          {candidate && candidate.name.length > 10 ? (
            <p className="mb-2 break-words text-sm font-medium text-[var(--on-surface)]">{candidate.name}</p>
          ) : null}
          {candidate ? (
            <>
              <p className="text-xs font-medium text-[var(--on-surface-variant)]">
                {t('trainingCycle.exerciseCount', { count: exercises.length })}
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm leading-relaxed text-[var(--on-surface)]">
                {exercises.map((exercise) => (
                  <li key={exercise.id} className="min-w-0 break-words">{getDisplayExerciseName(t, exercise)}</li>
                ))}
              </ul>
              {exercises.length === 0 ? <p className="mt-2 text-sm text-[var(--on-surface-variant)]">{t('trainingCycle.emptyPlanPreview')}</p> : null}
            </>
          ) : <p className="text-sm text-[var(--on-surface-variant)]">{t('trainingCycle.restDescription')}</p>}
          {error ? <p role="alert" className="mt-3 text-sm text-[var(--error)]">{error}</p> : null}
        </div>
      </BottomSheet>

      <PlanNameSheet
        error={error}
        createName={createName}
        renameName=""
        isOpen={open && creating}
        mode="create"
        isSubmitting={isSubmitting}
        onClose={() => {
          if (!isSubmitting) setCreating(false)
        }}
        onCreateNameChange={setCreateName}
        onRenameNameChange={() => {}}
        onSubmit={(event) => {
          event.preventDefault()
          if (pendingRef.current || isSubmitting || !createName.trim()) return
          pendingRef.current = true
          void onCreatePlan(createName.trim()).then((id) => {
            if (id) {
              setCandidateId(id)
              setCreating(false)
              setCreateName('')
            }
          }).finally(() => {
            pendingRef.current = false
          })
        }}
        onImported={(imported) => {
          void onPlansImported().then((loaded) => {
            if (loaded) {
              setCandidateId(imported[0]?.id ?? null)
              setCreating(false)
            }
          })
        }}
      />
      <ConfirmDialog
        open={open && confirmDelete}
        title={t('trainingCycle.deleteDayTitle')}
        description={t('trainingCycle.deleteDayDescription', { dayNumber: selectedIndex + 1 })}
        confirmLabel={t('common.delete')}
        danger
        onCancel={() => {
          if (!isSubmitting) setConfirmDelete(false)
        }}
        onConfirm={() => void deleteDay()}
      />
    </>
  )
}
