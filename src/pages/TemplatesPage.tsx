import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { TemplateCyclePreviewCard } from '../components/training-cycle/TemplateCyclePreviewCard'
import { PageHeader } from '../components/ui/PageHeader'
import { OverflowMenu } from '../components/ui/OverflowMenu'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TemplateExerciseList } from '../components/templates/TemplateExerciseList'
import { TemplateNameSheet } from '../components/templates/TemplateNameSheet'
import { TemplateSwitcher } from '../components/templates/TemplateSwitcher'
import { useTemplatesPageData } from '../hooks/pages/useTemplatesPageData'
import { useTemplatesPageUi } from '../hooks/pages/useTemplatesPageUi'
import { getTemplateColor } from '../lib/template-color'

export function TemplatesPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const templates = useTemplatesPageData()
  const ui = useTemplatesPageUi(templates)
  const shouldOpenTemplateCreateSheet =
    typeof location.state === 'object' &&
    location.state !== null &&
    'openTemplateCreateSheet' in location.state &&
    location.state.openTemplateCreateSheet === true
  const templateColorMap = useMemo(
    () => new Map(templates.templates.map((template, index) => [template.id, getTemplateColor(index)])),
    [templates.templates],
  )

  useEffect(() => {
    if (!shouldOpenTemplateCreateSheet) {
      return
    }

    ui.openTemplateSheet('create')
    navigate('/templates', { replace: true, state: null })
  }, [navigate, shouldOpenTemplateCreateSheet, ui])

  const menuItems = templates.currentTemplate
    ? [
        {
          label: t('templates.editName'),
          onSelect: () => ui.openTemplateSheet('rename'),
        },
        {
          label: t('templates.deleteTemplate'),
          danger: true,
          onSelect: () => ui.setTemplateDeleteOpen(true),
        },
      ]
    : []
  return (
    <div className="pb-4">
      <PageHeader
        title={t('templates.title')}
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
          templates={templates.templates}
          templatesCount={templates.templates.length}
          onCancelEditing={ui.closeExerciseEditor}
          onCreate={ui.openCreateExerciseEditor}
          onDeleteSelected={ui.handleDeleteExercisesAction}
          onDraftChange={ui.setExerciseDraft}
          onEdit={ui.openEditExerciseEditor}
          onImport={ui.handleImportExercisesAction}
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
        title={t('templates.deleteTitle')}
        description={
          templates.currentTemplate ? t('templates.deleteDescription', { name: templates.currentTemplate.name }) : ''
        }
        confirmLabel={t('common.delete')}
        danger
        onCancel={() => ui.setTemplateDeleteOpen(false)}
        onConfirm={() => void ui.handleConfirmDeleteTemplate()}
      />
    </div>
  )
}
