import { useMemo, useState, type FormEvent } from 'react'
import { ChevronLeft, CopyPlus, Plus, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { PlanWithExercises } from '../../db/plans'
import { BottomSheet } from '../ui/BottomSheet'
import { ConfirmDialog } from '../ui/ConfirmDialog'

type SaveSheetMode = 'actions' | 'create' | 'overwrite'

type SchedulePlanSaveSheetProps = {
  currentPlanId: string | null
  exerciseCount: number
  isOpen: boolean
  isSubmitting: boolean
  plans: PlanWithExercises[]
  onClose: () => void
  onCreatePlan: (name: string) => Promise<boolean>
  onOverwritePlan: (planId: string) => Promise<boolean>
}

export function SchedulePlanSaveSheet({
  currentPlanId,
  exerciseCount,
  isOpen,
  isSubmitting,
  plans,
  onClose,
  onCreatePlan,
  onOverwritePlan,
}: SchedulePlanSaveSheetProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<SaveSheetMode>('actions')
  const [planName, setPlanName] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [pendingOverwritePlanId, setPendingOverwritePlanId] = useState<string | null>(null)

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === currentPlanId) ?? null,
    [currentPlanId, plans],
  )
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [selectedPlanId, plans],
  )
  const pendingOverwritePlan = useMemo(
    () => plans.find((plan) => plan.id === pendingOverwritePlanId) ?? null,
    [pendingOverwritePlanId, plans],
  )

  function resetSheet() {
    setMode('actions')
    setPlanName('')
    setSelectedPlanId(null)
    setPendingOverwritePlanId(null)
  }

  function closeSheet() {
    resetSheet()
    onClose()
  }

  async function handleCreatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const didCreate = await onCreatePlan(planName)
    if (didCreate) {
      closeSheet()
    }
  }

  async function confirmOverwritePlan() {
    if (!pendingOverwritePlanId) {
      return
    }

    const didOverwrite = await onOverwritePlan(pendingOverwritePlanId)
    if (didOverwrite) {
      closeSheet()
    }
  }

  const title =
    mode === 'create'
      ? t('schedule.createPlanFromToday')
      : mode === 'overwrite'
        ? t('schedule.overwriteAnyPlan')
        : t('schedule.saveTodayAsPlan')

  return (
    <>
      <BottomSheet
        open={isOpen}
        title={title}
        description={t('schedule.saveTodayAsPlanDescription', { count: exerciseCount })}
        onClose={closeSheet}
      >
        {mode === 'actions' ? (
          <div className="space-y-2">
            {currentPlan ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setPendingOverwritePlanId(currentPlan.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--surface-container)] disabled:opacity-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-container)] text-[var(--primary)]">
                  <RefreshCw size={18} strokeWidth={2.25} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium text-[var(--on-surface)]">
                    {t('schedule.overwriteCurrentPlan')}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--on-surface-variant)]">
                    {currentPlan.name}
                  </span>
                </span>
              </button>
            ) : null}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setMode('create')}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--surface-container)] disabled:opacity-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-container)] text-[var(--primary)]">
                <Plus size={18} strokeWidth={2.25} />
              </span>
              <span className="text-base font-medium text-[var(--on-surface)]">
                {t('schedule.createPlanFromToday')}
              </span>
            </button>

            {plans.length > 0 ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setMode('overwrite')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--surface-container)] disabled:opacity-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-container)] text-[var(--primary)]">
                  <CopyPlus size={18} strokeWidth={2.25} />
                </span>
                <span className="text-base font-medium text-[var(--on-surface)]">
                  {t('schedule.overwriteAnyPlan')}
                </span>
              </button>
            ) : null}
          </div>
        ) : null}

        {mode === 'create' ? (
          <form className="mt-2 space-y-5" onSubmit={handleCreatePlan}>
            <button
              type="button"
              onClick={() => setMode('actions')}
              className="mb-1 flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-[var(--primary)]"
            >
              <ChevronLeft size={18} strokeWidth={2.25} />
              {t('common.back')}
            </button>

            <label className="block">
              <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
                {t('plans.planName')}
              </span>
              <input
                value={planName}
                disabled={isSubmitting}
                onChange={(event) => setPlanName(event.target.value)}
                className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
                placeholder={t('plans.planPlaceholder')}
              />
            </label>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !planName.trim()}
                className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
              >
                {t('schedule.saveAsPlan')}
              </button>
            </div>
          </form>
        ) : null}

        {mode === 'overwrite' ? (
          <div className="mt-2 space-y-4">
            <button
              type="button"
              onClick={() => setMode('actions')}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-[var(--primary)]"
            >
              <ChevronLeft size={18} strokeWidth={2.25} />
              {t('common.back')}
            </button>

            <p className="px-1 text-sm text-[var(--on-surface-variant)]">
              {t('schedule.selectPlanToOverwrite')}
            </p>

            <div className="-mx-2 max-h-[42vh] space-y-1 overflow-y-auto px-2">
              {plans.map((plan) => (
                <label
                  key={plan.id}
                  className="flex cursor-pointer items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-[var(--surface-container)]"
                >
                  <input
                    type="radio"
                    name="overwritePlan"
                    checked={selectedPlanId === plan.id}
                    disabled={isSubmitting}
                    onChange={() => setSelectedPlanId(plan.id)}
                    className="h-5 w-5 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base text-[var(--on-surface)]">
                      {plan.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--on-surface-variant)]">
                      {t('summary.exerciseCount', { count: plan.exercises.length })}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={isSubmitting || !selectedPlan}
                onClick={() => {
                  if (selectedPlan) {
                    setPendingOverwritePlanId(selectedPlan.id)
                  }
                }}
                className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
              >
                {t('schedule.overwritePlan')}
              </button>
            </div>
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={pendingOverwritePlan !== null}
        danger
        title={t('schedule.confirmOverwritePlanTitle')}
        description={
          pendingOverwritePlan
            ? t('schedule.confirmOverwritePlanDescription', {
                name: pendingOverwritePlan.name,
                count: exerciseCount,
              })
            : ''
        }
        confirmLabel={t('schedule.overwritePlan')}
        onCancel={() => setPendingOverwritePlanId(null)}
        onConfirm={() => void confirmOverwritePlan()}
      />
    </>
  )
}
