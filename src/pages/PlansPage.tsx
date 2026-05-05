import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { PlanCyclePreviewCard } from '../components/training-cycle/PlanCyclePreviewCard'
import { PageHeader } from '../components/ui/PageHeader'
import { OverflowMenu } from '../components/ui/OverflowMenu'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PlanExerciseList } from '../components/plans/PlanExerciseList'
import { PlanNameSheet } from '../components/plans/PlanNameSheet'
import { PlanSwitcher } from '../components/plans/PlanSwitcher'
import { usePlansPageData } from '../hooks/pages/usePlansPageData'
import { usePlansPageUi } from '../hooks/pages/usePlansPageUi'
import { getPlanColor } from '../lib/plan-color'

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
  const addedExerciseIds: string[] =
    typeof location.state === 'object' &&
    location.state !== null &&
    'addedExerciseIds' in location.state &&
    Array.isArray(location.state.addedExerciseIds)
      ? location.state.addedExerciseIds.filter((id: unknown): id is string => typeof id === 'string')
      : []
  const plans = usePlansPageData(preferredSelectedPlanId)
  const ui = usePlansPageUi(plans)
  const planColorMap = useMemo(
    () => new Map(plans.plans.map((plan, index) => [plan.id, getPlanColor(index)])),
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
    if (plans.isLoading || !plans.currentPlan || addedExerciseIds.length === 0) {
      return
    }

    const currentExerciseIds = new Set(plans.currentPlan.exercises.map((exercise) => exercise.id))
    const createdExerciseIds = addedExerciseIds.filter((exerciseId) => currentExerciseIds.has(exerciseId))
    if (createdExerciseIds.length === 0) {
      return
    }

    ui.startContinuousEdit(createdExerciseIds)
    navigate('/plans', {
      replace: true,
      state: { selectedPlanId: plans.currentPlan.id },
    })
  }, [addedExerciseIds, navigate, plans.currentPlan, plans.isLoading, ui])

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
    <div className="pb-4">
      <PageHeader
        title={t('plans.title')}
        titleAlign="center"
        actions={menuItems.length > 0 ? <OverflowMenu items={menuItems} /> : undefined}
      />

      <PlanSwitcher
        isSubmitting={plans.isSubmitting}
        selectedPlanId={plans.selectedPlanId}
        plans={plans.plans}
        onAiImport={() => navigate('/plans/ai-import')}
        onCreate={() => ui.openPlanSheet('create')}
        onSelect={(planId) => {
          ui.closeExerciseEditor()
          plans.setSelectedPlanId(planId)
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
        daysUntil={plans.currentPlanCyclePreview?.daysUntil ?? null}
        getPlanColor={(planId) => planColorMap.get(planId) ?? null}
        planId={plans.currentPlan?.id ?? null}
      />

      <section className="mt-4">
        <PlanExerciseList
          currentPlan={plans.currentPlan}
          draft={ui.exerciseDraft}
          editExerciseId={ui.editExerciseId}
          isCreatingExercise={ui.isCreatingExercise}
          isLoading={plans.isLoading}
          isSubmitting={plans.isSubmitting}
          pendingScrollExerciseId={ui.continuousEditScrollExerciseId ?? plans.lastCreatedExerciseId}
          plansCount={plans.plans.length}
          onCancelEditing={ui.closeExerciseEditor}
          onCreate={() => {
            if (plans.currentPlan) {
              navigate(`/exercise-picker?target=plan&planId=${plans.currentPlan.id}`)
            }
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
        />
      </section>

      <PlanNameSheet
        createName={plans.newPlanName}
        isOpen={ui.planSheetMode !== null}
        isSubmitting={plans.isSubmitting}
        mode={ui.planSheetMode}
        renameName={ui.renamePlanName}
        onClose={() => ui.setPlanSheetMode(null)}
        onCreateNameChange={plans.setNewPlanName}
        onRenameNameChange={ui.setRenamePlanName}
        onSubmit={(event) => void ui.handlePlanSubmit(event, ui.renamePlanName)}
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
