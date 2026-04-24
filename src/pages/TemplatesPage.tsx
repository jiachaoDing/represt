import { PageHeader } from '../components/ui/PageHeader'
import { OverflowMenu } from '../components/ui/OverflowMenu'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Snackbar } from '../components/ui/Snackbar'
import { TemplateExerciseList } from '../components/templates/TemplateExerciseList'
import { TemplateNameSheet } from '../components/templates/TemplateNameSheet'
import { TemplateSwitcher } from '../components/templates/TemplateSwitcher'
import { useTemplatesPageData } from '../hooks/pages/useTemplatesPageData'
import { useTemplatesPageUi } from '../hooks/pages/useTemplatesPageUi'

export function TemplatesPage() {
  const templates = useTemplatesPageData()
  const ui = useTemplatesPageUi(templates)
  const menuItems = templates.currentTemplate
    ? [
        {
          label: '编辑名称',
          onSelect: () => ui.openTemplateSheet('rename'),
        },
        {
          label: '删除模板',
          danger: true,
          onSelect: () => ui.setTemplateDeleteOpen(true),
        },
      ]
    : []

  return (
    <div className="pb-4">
      <PageHeader
        title="模板管理"
        actions={menuItems.length > 0 ? <OverflowMenu items={menuItems} /> : undefined}
      />

      <TemplateSwitcher
        isSubmitting={templates.isSubmitting}
        selectedTemplateId={templates.selectedTemplateId}
        templates={templates.templates}
        onCreate={() => ui.openTemplateSheet('create')}
        onSelect={(templateId) => {
          ui.closeExerciseEditor()
          templates.setSelectedTemplateId(templateId)
        }}
      />

      {templates.error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {templates.error}
        </div>
      ) : null}

      <section className="mt-4">
        <TemplateExerciseList
          currentTemplate={templates.currentTemplate}
          draft={ui.exerciseDraft}
          editExerciseId={ui.editExerciseId}
          isCreatingExercise={ui.isCreatingExercise}
          isLoading={templates.isLoading}
          isSubmitting={templates.isSubmitting}
          pendingScrollExerciseId={templates.lastCreatedExerciseId}
          templatesCount={templates.templates.length}
          onCancelEditing={ui.closeExerciseEditor}
          onCreate={ui.openCreateExerciseEditor}
          onDelete={ui.setDeleteExerciseId}
          onDraftChange={ui.setExerciseDraft}
          onEdit={ui.openEditExerciseEditor}
          onReorder={(orderedExerciseIds) =>
            templates.currentTemplate
              ? templates.handleReorderExercises(templates.currentTemplate.id, orderedExerciseIds)
              : Promise.resolve(false)
          }
          onScrollAnimationComplete={templates.clearLastCreatedExerciseId}
          onSubmit={ui.handleExerciseSubmit}
        />
      </section>

      <TemplateNameSheet
        createName={templates.newTemplateName}
        isOpen={ui.templateSheetMode !== null}
        isSubmitting={templates.isSubmitting}
        mode={ui.templateSheetMode}
        renameName={ui.renameTemplateName}
        onClose={() => ui.setTemplateSheetMode(null)}
        onCreateNameChange={templates.setNewTemplateName}
        onRenameNameChange={ui.setRenameTemplateName}
        onSubmit={(event) => void ui.handleTemplateSubmit(event, ui.renameTemplateName)}
      />

      <ConfirmDialog
        open={ui.deleteExercise !== null}
        title="删除动作？"
        description={ui.deleteExercise ? `确定从模板中删除“${ui.deleteExercise.name}”吗？` : ''}
        confirmLabel="删除"
        danger
        onCancel={() => ui.setDeleteExerciseId(null)}
        onConfirm={() => void ui.handleConfirmDeleteExercise()}
      />

      <ConfirmDialog
        open={ui.templateDeleteOpen && templates.currentTemplate !== null}
        title="删除模板？"
        description={
          templates.currentTemplate ? `确定删除“${templates.currentTemplate.name}”吗？该操作无法恢复。` : ''
        }
        confirmLabel="删除"
        danger
        onCancel={() => ui.setTemplateDeleteOpen(false)}
        onConfirm={() => void ui.handleConfirmDeleteTemplate()}
      />

      <Snackbar message={ui.message} />
    </div>
  )
}
