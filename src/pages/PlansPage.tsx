import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { PlanCyclePreviewCard } from '../components/training-cycle/PlanCyclePreviewCard'
import { PageHeader } from '../components/ui/PageHeader'
import { OverflowMenu } from '../components/ui/OverflowMenu'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PlanExerciseList } from '../components/plans/PlanExerciseList'
import { PlanNameSheet } from '../components/plans/PlanNameSheet'
import { PlanShareSheet } from '../components/plans/PlanShareSheet'
import { PlanSwitcher } from '../components/plans/PlanSwitcher'
import { usePlansPageData } from '../hooks/pages/usePlansPageData'
import { usePlansPageUi } from '../hooks/pages/usePlansPageUi'
import { getTemplateColor } from '../lib/plan-color'
import { notifyPlansChanged } from '../lib/plan-change-events'

export function PlansPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const shouldOpenPlanCreateSheet =
    typeof location.state === 'object' &&
    location.state !== null &&
    'openPlanCreateSheet' in location.state &&
    location.state.openPlanCreateSheet === true
  const preferredSelectedPlanId =
    typeof location.state === 'object' &&
    location.state !== null &&
    'selectedPlanId' in location.state &&
    typeof location.state.selectedPlanId === 'string'
      ? location.state.selectedPlanId
      : null
  const addedExerciseIds = useMemo<string[]>(
    () =>
      typeof location.state === 'object' &&
      location.state !== null &&
      'addedExerciseIds' in location.state &&
      Array.isArray(location.state.addedExerciseIds)
        ? location.state.addedExerciseIds.filter((id: unknown): id is string => typeof id === 'string')
        : [],
    [location.state],
  )
  const plans = usePlansPageData(preferredSelectedPlanId)
  const ui = usePlansPageUi(plans)
  const [sharePlanId, setSharePlanId] = useState<string | null>(null)
  const handledAddedExerciseLocationKeyRef = useRef<string | null>(null)
  const planColorMap = useMemo(
    () => new Map(plans.plans.map((plan) => [plan.id, getTemplateColor(plan)])),
    [plans.plans],
  )

  useEffect(() => {
    if (!shouldOpenPlanCreateSheet) {
      return
    }

    ui.openPlanSheet('create')
    navigate('/plans', { replace: true, state: null })
  }, [navigate, shouldOpenPlanCreateSheet, ui])

  useEffect(() => {
    if (
      plans.isLoading ||
      !plans.currentPlan ||
      addedExerciseIds.length === 0 ||
      handledAddedExerciseLocationKeyRef.current === location.key
    ) {
      return
    }

    const currentExerciseIds = new Set(plans.currentPlan.exercises.map((exercise) => exercise.id))
    const createdExerciseIds = addedExerciseIds.filter((exerciseId) => currentExerciseIds.has(exerciseId))
    if (createdExerciseIds.length === 0) {
      return
    }

    handledAddedExerciseLocationKeyRef.current = location.key
    navigate('/plans', {
      replace: true,
      state: { selectedPlanId: plans.currentPlan.id },
    })
    ui.startContinuousEdit(createdExerciseIds)
  }, [addedExerciseIds, location.key, navigate, plans.currentPlan, plans.isLoading, ui])

  async function changeViewedPlan(select: () => void) {
    if (ui.isExerciseEditorActive && !(await ui.saveExerciseEditor())) {
      return false
    }
    ui.closeExerciseEditor()
    select()
    return true
  }

  const menuItems = plans.currentPlan
    ? [
        {
          label: t('plans.editName'),
          onSelect: () => ui.openPlanSheet('rename'),
        },
        {
          label: t('plans.deletePlan'),
          danger: true,
          onSelect: () => ui.setPlanDeleteOpen(true),
        },
      ]
    : []
  return (
    <div className="pb-10">
      <PageHeader
        title={t('plans.title')}
        titleAlign="center"
        leadingAction={
          <button
            type="button"
            onClick={() => ui.openPlanSheet('create')}
            disabled={plans.isSubmitting}
            aria-label={t('plans.newPlan')}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10 disabled:opacity-40 tap-highlight-transparent"
          >
            <Plus size={24} strokeWidth={2.2} aria-hidden="true" />
          </button>
        }
        actions={
          plans.currentPlan ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSharePlanId(plans.currentPlan?.id ?? null)}
                aria-label={t('planShare.menuItem')}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--on-surface-variant)]/10 tap-highlight-transparent"
              >
                <Share2 size={22} strokeWidth={2.2} aria-hidden="true" />
              </button>
              <OverflowMenu items={menuItems} />
            </div>
          ) : undefined
        }
      />

      <PlanSwitcher
        isSubmitting={plans.isSubmitting}
        selectedPlanId={plans.selectedPlanId}
        plans={plans.plans}
        onSelect={(planId) => {
          void changeViewedPlan(() => plans.setSelectedPlanId(planId))
        }}
      />

      {plans.error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {plans.error}
        </div>
      ) : null}

      <PlanCyclePreviewCard
        cycle={plans.trainingCycle}
        currentIndex={plans.todayCycleDay?.index ?? null}
        daysUntil={plans.selectedCycleIndex !== null && plans.todayCycleDay && plans.trainingCycle
          ? (plans.selectedCycleIndex - plans.todayCycleDay.index + plans.trainingCycle.slots.length) % plans.trainingCycle.slots.length
          : plans.currentPlanCyclePreview?.daysUntil ?? null}
        getPlanColor={(planId) => planColorMap.get(planId) ?? null}
        planId={plans.currentPlan?.id ?? null}
        selectedIndex={plans.selectedCycleIndex}
        disabled={plans.isSubmitting}
        getDayLabel={(index) => {
          const slot = plans.trainingCycle?.slots[index]
          const plan = plans.plans.find((item) => item.id === slot?.planId)
          return t('trainingCycle.viewDay', {
            dayNumber: index + 1,
            name: plan?.name ?? t('trainingCycle.restDay'),
          })
        }}
        onSelect={(index) => changeViewedPlan(() => plans.selectCycleDay(index))}
      />

      <section className="mt-4">
        {plans.isViewingRestDay ? (
          <div className="px-4 py-6 text-center">
            <p className="font-medium">{t('trainingCycle.restDay')}</p>
            <p className="mt-2 text-sm text-[var(--on-surface-variant)]">{t('trainingCycle.restDescription')}</p>
          </div>
        ) : <PlanExerciseList
          key={plans.currentPlan?.id ?? 'empty'}
          currentPlan={plans.currentPlan}
          draft={ui.exerciseDraft}
          editExerciseId={ui.editExerciseId}
          isCreatingExercise={ui.isCreatingExercise}
          isLoading={plans.isLoading}
          isSubmitting={plans.isSubmitting}
          pendingScrollExerciseId={ui.continuousEditScrollExerciseId ?? plans.lastCreatedExerciseId}
          plansCount={plans.plans.length}
          onCancelEditing={ui.closeExerciseEditor}
          onCopy={ui.handleCopyExerciseAction}
          onCreate={() => {
            if (plans.currentPlan) {
              navigate(`/exercise-picker?target=plan&planId=${plans.currentPlan.id}`)
              return
            }

            ui.openPlanSheet('create')
          }}
          onDeleteSelected={ui.handleDeleteExercisesAction}
          onDraftChange={ui.setExerciseDraft}
          onEdit={ui.openEditExerciseEditor}
          onReorder={(orderedExerciseIds) =>
            plans.currentPlan
              ? plans.handleReorderExercises(plans.currentPlan.id, orderedExerciseIds)
              : Promise.resolve(false)
          }
          onScrollAnimationComplete={plans.clearLastCreatedExerciseId}
          onSaveEdit={() => ui.saveExerciseEditor()}
          onSubmit={ui.handleExerciseSubmit}
        />}
      </section>

      <PlanNameSheet
        createName={plans.newPlanName}
        isOpen={ui.planSheetMode !== null}
        isSubmitting={plans.isSubmitting}
        mode={ui.planSheetMode}
        renameName={ui.renamePlanName}
        onClose={() => ui.setPlanSheetMode(null)}
        onAiImport={() => {
          ui.setPlanSheetMode(null)
          navigate('/plans/ai-import')
        }}
        onCreateNameChange={plans.setNewPlanName}
        onRenameNameChange={ui.setRenamePlanName}
        onSubmit={(event) => void ui.handlePlanSubmit(event, ui.renamePlanName)}
        onImported={(importedPlans, data) => {
          const selectedPlanId = importedPlans[0]?.id ?? null
          notifyPlansChanged(selectedPlanId)
          ui.setPlanSheetMode(null)
          navigate(data.cycle.length > 0 ? '/plans/cycle' : '/plans', {
            state: data.cycle.length > 0 ? undefined : { selectedPlanId },
          })
        }}
      />

      <PlanShareSheet
        open={sharePlanId !== null}
        planId={sharePlanId}
        onClose={() => setSharePlanId(null)}
      />

      <ConfirmDialog
        open={ui.planDeleteOpen && plans.currentPlan !== null}
        title={t('plans.deleteTitle')}
        description={
          plans.currentPlan ? t('plans.deleteDescription', { name: plans.currentPlan.name }) : ''
        }
        confirmLabel={t('common.delete')}
        danger
        onCancel={() => ui.setPlanDeleteOpen(false)}
        onConfirm={() => void ui.handleConfirmDeletePlan()}
      />
    </div>
  )
}
