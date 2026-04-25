import { useMemo, useState } from 'react'

import { TemplateCyclePreviewCard } from '../components/training-cycle/TemplateCyclePreviewCard'
import { PageHeader } from '../components/ui/PageHeader'
import { OverflowMenu } from '../components/ui/OverflowMenu'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Snackbar } from '../components/ui/Snackbar'
import { TemplateExerciseList } from '../components/templates/TemplateExerciseList'
import { TemplateNameSheet } from '../components/templates/TemplateNameSheet'
import { TemplateSwitcher } from '../components/templates/TemplateSwitcher'
import { useTemplatesPageData } from '../hooks/pages/useTemplatesPageData'
import { useTemplatesPageUi } from '../hooks/pages/useTemplatesPageUi'
import { getTemplateColor } from '../lib/template-color'

export function TemplatesPage() {
  const templates = useTemplatesPageData()
  const ui = useTemplatesPageUi(templates)
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)
  const templateColorMap = useMemo(
    () => new Map(templates.templates.map((template, index) => [template.id, getTemplateColor(index)])),
    [templates.templates],
  )
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
  const batchDeleteExerciseIds = templates.currentTemplate?.exercises.map((exercise) => exercise.id) ?? []

  return (
    <div className="pb-4">
      <PageHeader
        title="模板管理"
        titleAlign="center"
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

      <TemplateCyclePreviewCard
        cycle={templates.trainingCycle}
        currentIndex={templates.todayCycleDay?.index ?? null}
        daysUntil={templates.currentTemplateCyclePreview?.daysUntil ?? null}
        getTemplateColor={(templateId) => templateColorMap.get(templateId) ?? null}
        templateId={templates.currentTemplate?.id ?? null}
      />

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
          onDelete={(exerciseId) => void ui.handleDeleteExerciseAction(exerciseId)}
          onDraftChange={ui.setExerciseDraft}
          onEdit={ui.openEditExerciseEditor}
          onOpenBatchDelete={() => setBatchDeleteOpen(true)}
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

      <ConfirmDialog
        open={batchDeleteOpen && templates.currentTemplate !== null}
        title="批量删除动作？"
        description={`将删除当前模板中的 ${batchDeleteExerciseIds.length} 个动作。`}
        confirmLabel="删除"
        danger
        onCancel={() => setBatchDeleteOpen(false)}
        onConfirm={() => {
          void ui.handleDeleteExercisesAction(batchDeleteExerciseIds).then((didDelete) => {
            if (didDelete) {
              setBatchDeleteOpen(false)
            }
          })
        }}
      />

      <Snackbar message={ui.message} />
    </div>
  )
}
