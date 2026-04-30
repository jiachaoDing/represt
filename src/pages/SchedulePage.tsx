import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { TodayTrainingPlanCard } from '../components/training-cycle/TodayTrainingPlanCard'
import { PageHeader } from '../components/ui/PageHeader'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SettingsButton } from '../components/settings/SettingsButton'
import { useNow } from '../hooks/useNow'
import { useSchedulePageData } from '../hooks/pages/useSchedulePageData'
import { useSchedulePageUi } from '../hooks/pages/useSchedulePageUi'
import { getTemplateColor } from '../lib/template-color'
import { ScheduleExerciseList } from '../components/schedule/ScheduleExerciseList'
import { ScheduleExerciseSheet } from '../components/schedule/ScheduleExerciseSheet'
import { ScheduleTemplateImportSheet } from '../components/schedule/ScheduleTemplateImportSheet'

export function SchedulePage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const now = useNow()
  const schedule = useSchedulePageData()
  const ui = useSchedulePageUi(schedule)
  const templateColorMap = useMemo(
    () => new Map(schedule.templates.map((template, index) => [template.id, getTemplateColor(index)])),
    [schedule.templates],
  )

  const todayStr = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date())
  const completedSets =
    schedule.currentSession?.exercises.reduce((sum, exercise) => sum + exercise.completedSets, 0) ?? 0
  const totalSets = schedule.currentSession?.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0) ?? 0
  const isStarterState =
    !schedule.isLoading &&
    schedule.currentSession !== null &&
    schedule.currentSession.exercises.length === 0 &&
    completedSets === 0 &&
    (schedule.trainingCycle?.slots.length ?? 0) === 0
  const importConfirmDescription = [
    ui.pendingTemplateImportConfirmation?.isDuplicateImport
      ? t('schedule.duplicateImport', { name: ui.pendingTemplateImportConfirmation.templateName })
      : null,
    ui.pendingTemplateImportConfirmation?.willContinueCompletedSession ? t('schedule.willUpdateSummary') : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="pb-4">
      <PageHeader 
        title={todayStr} 
        titleAlign="start"
        actions={<SettingsButton />}
      />

      {!schedule.isLoading ? (
        <div className={isStarterState ? 'flex min-h-[calc(100vh-13rem-env(safe-area-inset-bottom))] items-center' : ''}>
          <TodayTrainingPlanCard
            cycle={schedule.trainingCycle}
            currentIndex={schedule.todayCycleDay?.index ?? null}
            didAutoImportToday={schedule.didAutoImportToday}
            getTemplateColor={(templateId) => templateColorMap.get(templateId) ?? null}
            todayTemplateName={schedule.todayTemplate?.name ?? null}
            completedSets={completedSets}
            totalSets={totalSets}
            isStarterState={isStarterState}
            onChooseTemplate={() => navigate('/templates/starter')}
            onCreateExercise={ui.openAddEntry}
          />
        </div>
      ) : null}

      {!schedule.isLoading && schedule.templateSyncStatus.hasUpdates ? (
        <div className="mx-4 mb-4 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-container)]/20 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--on-surface)]">
                {t('schedule.templateUpdatedTitle', { name: schedule.templateSyncStatus.templateName ?? t('common.templateFallback') })}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">
                {t('schedule.templateUpdatedDescription')}
              </p>
            </div>
            <button
              type="button"
              disabled={schedule.isSubmitting}
              onClick={() => void ui.handleSyncTemplateAction()}
              className="shrink-0 rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-50"
            >
              {t('schedule.syncTemplate')}
            </button>
          </div>
        </div>
      ) : null}

      {schedule.error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {schedule.error}
        </div>
      ) : null}

      {schedule.isLoading || !isStarterState ? (
        <section className="mt-2">
          <ScheduleExerciseList
            currentSession={schedule.currentSession}
            hasTemplates={schedule.hasTemplates}
            isLoading={schedule.isLoading}
            isSubmitting={schedule.isSubmitting}
            now={now}
            onOpenAdd={ui.openAddEntry}
            onDeleteSelected={ui.handleDeleteExercisesAction}
            onEditExercise={schedule.handleReplaceExercise}
            onReorder={schedule.handleReorderExercises}
          />
        </section>
      ) : null}

      <ScheduleExerciseSheet
        draft={schedule.newExerciseDraft}
        isOpen={ui.isCreateSheetOpen}
        isSubmitting={schedule.isSubmitting}
        onClose={() => ui.setIsCreateSheetOpen(false)}
        onDraftChange={schedule.setNewExerciseDraft}
        onSubmit={ui.handleAddExercise}
      />

      <ScheduleTemplateImportSheet
        isOpen={ui.isTemplateSheetOpen}
        isSubmitting={schedule.isSubmitting}
        selectedExerciseIds={ui.selectedTemplateExerciseIds}
        sourceTemplates={ui.isAllTemplateImportMode ? schedule.templates : undefined}
        template={ui.importSourceTemplate}
        onClose={ui.closeTemplateImportSheet}
        onCreateExercise={ui.isAllTemplateImportMode ? ui.createExerciseFromTemplateImportSheet : undefined}
        onSubmit={() => void ui.handleImportTemplate()}
        onToggleExercise={ui.toggleTemplateExercise}
      />

      <ConfirmDialog
        open={ui.isContinueDialogOpen}
        title={t('schedule.continueTodayTitle')}
        description={t('schedule.willUpdateSummary')}
        confirmLabel={t('common.continue')}
        onCancel={() => ui.setIsContinueDialogOpen(false)}
        onConfirm={() => void ui.addExercise()}
      />

      <ConfirmDialog
        open={ui.pendingTemplateImportConfirmation !== null}
        title={t('schedule.importConfirmTitle')}
        description={importConfirmDescription}
        confirmLabel={t('common.continue')}
        onCancel={() => {
          ui.setPendingTemplateImportId(null)
          ui.setPendingTemplateExerciseIds([])
        }}
        onConfirm={() => void ui.confirmPendingTemplateImport()}
      />
    </div>
  )
}
