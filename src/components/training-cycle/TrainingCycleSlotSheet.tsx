import { useLayoutEffect, useRef, useState } from 'react'
import { Check, Moon, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { BottomSheet } from '../ui/BottomSheet'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { PlanNameSheet } from '../plans/PlanNameSheet'
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
  const assignedId = selectedPlan?.id ?? null
  const unchanged = candidateId === assignedId
  const missingCandidate = candidateId !== null && candidate === null
  const exercises = candidate?.exercises ?? []
  const sheetVisible = open && !creating && !confirmDelete

  useLayoutEffect(() => {
    const container = scrollRef.current
    const selected = selectedRef.current
    if (!sheetVisible || !container || !selected) return
    const containerRect = container.getBoundingClientRect()
    const selectedRect = selected.getBoundingClientRect()
    container.scrollTop += selectedRect.top - containerRect.top - (containerRect.height - selectedRect.height) / 2
  }, [plans.length, sheetVisible])

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
        variant="expanded"
        title={t('trainingCycle.dayNumber', { dayNumber: selectedIndex + 1 })}
        actions={
          <>
            {error ? <p role="alert" className="mb-2 text-sm text-[var(--error)]">{error}</p> : null}
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
                <Check size={17} className="shrink-0" aria-hidden="true" />
                {t('trainingCycle.confirmAssignment')}
              </button>
            </div>
          </>
        }
      >
        <div className="flex min-h-0 flex-1" data-primary-tab-swipe-lock="true">
          <div className="flex min-h-0 w-[clamp(6.75rem,28vw,7.25rem)] shrink-0 flex-col bg-[var(--surface-container-high)]">
            <div ref={scrollRef} role="group" aria-label={t('trainingCycle.selectPlan')} className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {[null, ...plans].map((plan) => {
                const id = plan?.id ?? null
                const name = plan?.name ?? t('trainingCycle.restDay')
                const active = candidateId === id
                const assigned = assignedId === id
                const color = plan ? getTemplateColor(plan) : restDayColor
                return (
                  <button
                    key={id ?? 'rest'}
                    ref={active ? selectedRef : undefined}
                    type="button"
                    aria-pressed={active}
                    disabled={isSubmitting}
                    title={name}
                    onClick={() => setCandidateId(id)}
                    className={`flex min-h-11 w-full flex-col items-start gap-1 border-l-2 px-2.5 py-3 text-left text-sm transition-colors tap-highlight-transparent disabled:opacity-40 ${active ? 'font-semibold' : 'font-normal hover:opacity-90'}`}
                    style={{
                      backgroundColor: color.soft,
                      color: color.text,
                      borderLeftColor: active ? color.solid : 'transparent',
                    }}
                  >
                    <span className="flex w-full items-start gap-1.5">
                      <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color.solid }} />
                      <span className="min-w-0 break-words leading-snug [overflow-wrap:anywhere]">{name}</span>
                    </span>
                    {assigned ? (
                      <span className="flex items-center gap-1 pl-3 text-[10px] font-normal leading-tight">
                        <Check size={12} className="shrink-0" aria-hidden="true" />
                        {t('trainingCycle.assignedPlan')}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              disabled={isSubmitting}
              aria-label={t('plans.newPlan')}
              className="flex min-h-11 w-full shrink-0 items-center justify-center border-t border-[var(--outline-variant)]/40 text-[var(--primary)] transition-colors hover:bg-[var(--primary-container)] disabled:opacity-40"
            >
              <Plus size={22} aria-hidden="true" />
            </button>
          </div>

          <section key={candidateId ?? 'rest'} aria-label={t('trainingCycle.planPreview')} className="scrollbar-hide min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2" tabIndex={0}>
            <p className="text-xs text-[var(--on-surface-variant)]">{t('trainingCycle.planPreview')}</p>
            <h3 className="mt-1 whitespace-normal break-words text-base font-semibold leading-snug text-[var(--on-surface)] [overflow-wrap:anywhere]">
              {candidate?.name ?? t('trainingCycle.restDay')}
            </h3>
            {candidate ? (
              <>
                <p className="mt-2 text-xs font-medium text-[var(--on-surface-variant)]">
                  {t('trainingCycle.exerciseCount', { count: exercises.length })}
                </p>
                <ul className="mt-2 divide-y divide-[var(--outline-variant)]/30 text-sm leading-relaxed text-[var(--on-surface)]">
                  {exercises.map((exercise) => (
                    <li key={exercise.id} className="break-words py-2 [overflow-wrap:anywhere]">
                      {getDisplayExerciseName(t, exercise)}
                    </li>
                  ))}
                </ul>
                {exercises.length === 0 ? <p className="mt-2 text-sm text-[var(--on-surface-variant)]">{t('trainingCycle.emptyPlanPreview')}</p> : null}
              </>
            ) : (
              <div className="mt-4 text-sm text-[var(--on-surface-variant)]">
                <Moon size={22} className="mb-2" aria-hidden="true" />
                {t('trainingCycle.restDescription')}
              </div>
            )}
          </section>
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
          if (pendingRef.current || isSubmitting) return
          pendingRef.current = true
          void onPlansImported().then((loaded) => {
            if (loaded) {
              const planId = imported[0]?.id
              if (planId) setCandidateId(planId)
              setCreating(false)
            }
          }).finally(() => {
            pendingRef.current = false
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
