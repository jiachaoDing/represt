import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { TodayTrainingPlanCard } from '../components/training-cycle/TodayTrainingPlanCard'
import { PageHeader } from '../components/ui/PageHeader'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useNow } from '../hooks/useNow'
import { useBackLinkState } from '../hooks/useRouteBack'
import { useSchedulePageData } from '../hooks/pages/useSchedulePageData'
import { useSchedulePageUi } from '../hooks/pages/useSchedulePageUi'
import { getTemplateColor } from '../lib/template-color'
import { ScheduleActionSheet } from '../components/schedule/ScheduleActionSheet'
import { ScheduleExerciseList } from '../components/schedule/ScheduleExerciseList'
import { ScheduleExerciseSheet } from '../components/schedule/ScheduleExerciseSheet'
import { ScheduleTemplateImportSheet } from '../components/schedule/ScheduleTemplateImportSheet'

export function SchedulePage() {
  const now = useNow()
  const backLinkState = useBackLinkState()
  const schedule = useSchedulePageData()
  const ui = useSchedulePageUi(schedule)
  const templateColorMap = useMemo(
    () => new Map(schedule.templates.map((template, index) => [template.id, getTemplateColor(index)])),
    [schedule.templates],
  )

  const todayStr = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date())
  const completedSets =
    schedule.currentSession?.exercises.reduce((sum, exercise) => sum + exercise.completedSets, 0) ?? 0
  const totalSets = schedule.currentSession?.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0) ?? 0
  const importConfirmDescription = [
    ui.pendingTemplateImportConfirmation?.isDuplicateImport
      ? `“${ui.pendingTemplateImportConfirmation.templateName}”可能已加入过今日训练。`
      : null,
    ui.pendingTemplateImportConfirmation?.willContinueCompletedSession ? '会更新今日训练总结。' : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="pb-4">
      <PageHeader 
        title={todayStr} 
        titleAlign="start"
        actions={
          <Link
            to="/calendar"
            state={backLinkState}
            viewTransition
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--outline-variant)] text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--on-surface-variant)]/5"
            aria-label="日历"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </Link>
        }
      />

      {!schedule.isLoading ? (
        <TodayTrainingPlanCard
          cycle={schedule.trainingCycle}
          currentIndex={schedule.todayCycleDay?.index ?? null}
          didAutoImportToday={schedule.didAutoImportToday}
          getTemplateColor={(templateId) => templateColorMap.get(templateId) ?? null}
          todayTemplateName={schedule.todayTemplate?.name ?? null}
          completedSets={completedSets}
          totalSets={totalSets}
        />
      ) : null}

      {!schedule.isLoading && schedule.templateSyncStatus.hasUpdates ? (
        <div className="mx-4 mb-4 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-container)]/20 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--on-surface)]">
                {schedule.templateSyncStatus.templateName ?? '模板'} 有更新
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">
                会按当前模板重建今日动作；已记录的组会保留到总结页。
              </p>
            </div>
            <button
              type="button"
              disabled={schedule.isSubmitting}
              onClick={() => void ui.handleSyncTemplateAction()}
              className="shrink-0 rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-50"
            >
              同步模板
            </button>
          </div>
        </div>
      ) : null}

      {schedule.error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {schedule.error}
        </div>
      ) : null}

      <section className="mt-2">
        <ScheduleExerciseList
          currentSession={schedule.currentSession}
          hasTemplates={schedule.hasTemplates}
          isLoading={schedule.isLoading}
          isSubmitting={schedule.isSubmitting}
          now={now}
          onOpenAdd={ui.openAddEntry}
          onDeleteSelected={ui.handleDeleteExercisesAction}
          onReorder={schedule.handleReorderExercises}
        />
      </section>

      <ScheduleActionSheet
        hasTemplates={schedule.hasTemplates}
        isOpen={ui.isActionSheetOpen}
        templates={schedule.templates}
        onClose={() => ui.setIsActionSheetOpen(false)}
        onCreateExercise={() => {
          ui.setIsActionSheetOpen(false)
          ui.setIsCreateSheetOpen(true)
        }}
        onSelectTemplate={ui.selectTemplateForImport}
      />

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
        template={ui.importSourceTemplate}
        onClose={() => ui.setIsTemplateSheetOpen(false)}
        onSubmit={() => void ui.handleImportTemplate()}
        onToggleExercise={ui.toggleTemplateExercise}
      />

      <ConfirmDialog
        open={ui.isContinueDialogOpen}
        title="继续今日训练？"
        description="会更新今日训练总结。"
        confirmLabel="继续"
        onCancel={() => ui.setIsContinueDialogOpen(false)}
        onConfirm={() => void ui.addExercise()}
      />

      <ConfirmDialog
        open={ui.pendingTemplateImportConfirmation !== null}
        title="加入这组动作？"
        description={importConfirmDescription}
        confirmLabel="继续"
        onCancel={() => {
          ui.setPendingTemplateImportId(null)
          ui.setPendingTemplateExerciseIds([])
        }}
        onConfirm={() => void ui.confirmPendingTemplateImport()}
      />
    </div>
  )
}
