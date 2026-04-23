import { Link } from 'react-router-dom'

import { PageHeader } from '../components/ui/PageHeader'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { FloatingActionButton } from '../components/ui/FloatingActionButton'
import { Snackbar } from '../components/ui/Snackbar'
import { useNow } from '../hooks/useNow'
import { useSchedulePageData } from '../hooks/pages/useSchedulePageData'
import { useSchedulePageUi } from '../hooks/pages/useSchedulePageUi'
import { ScheduleActionSheet } from '../components/schedule/ScheduleActionSheet'
import { ScheduleExerciseList } from '../components/schedule/ScheduleExerciseList'
import { ScheduleExerciseSheet } from '../components/schedule/ScheduleExerciseSheet'
import { ScheduleProgressCard } from '../components/schedule/ScheduleProgressCard'
import { ScheduleTemplateImportSheet } from '../components/schedule/ScheduleTemplateImportSheet'

export function SchedulePage() {
  const now = useNow()
  const schedule = useSchedulePageData()
  const ui = useSchedulePageUi(schedule)

  const todayStr = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date())
  const completedCount =
    schedule.currentSession?.exercises.filter((exercise) => exercise.status === 'completed')
      .length ?? 0
  const totalCount = schedule.currentSession?.exercises.length ?? 0
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
        actions={
          <Link
            to="/calendar"
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

      {!schedule.isLoading && schedule.currentSession ? (
        <ScheduleProgressCard completedCount={completedCount} totalCount={totalCount} />
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
          now={now}
          onDelete={ui.setDeleteExerciseId}
          onOpenAdd={ui.openAddEntry}
        />
      </section>

      {schedule.canAddTemporaryExercise ? <FloatingActionButton onClick={ui.openAddEntry} /> : null}

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

      <ConfirmDialog
        open={ui.deleteExercise !== null}
        title="删除动作？"
        description={ui.deleteExercise ? `确定删除“${ui.deleteExercise.name}”吗？该操作无法恢复。` : ''}
        confirmLabel="删除"
        danger
        onCancel={() => ui.setDeleteExerciseId(null)}
        onConfirm={() => void ui.handleConfirmDelete()}
      />

      <Snackbar message={ui.message} />
    </div>
  )
}
