import { useMemo, useState, type FormEvent } from 'react'
import { ChevronLeft, CopyPlus, Plus, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { TemplateWithExercises } from '../../db/templates'
import { BottomSheet } from '../ui/BottomSheet'
import { ConfirmDialog } from '../ui/ConfirmDialog'

type SaveSheetMode = 'actions' | 'create' | 'overwrite'

type ScheduleTemplateSaveSheetProps = {
  currentTemplateId: string | null
  exerciseCount: number
  isOpen: boolean
  isSubmitting: boolean
  templates: TemplateWithExercises[]
  onClose: () => void
  onCreateTemplate: (name: string) => Promise<boolean>
  onOverwriteTemplate: (templateId: string) => Promise<boolean>
}

export function ScheduleTemplateSaveSheet({
  currentTemplateId,
  exerciseCount,
  isOpen,
  isSubmitting,
  templates,
  onClose,
  onCreateTemplate,
  onOverwriteTemplate,
}: ScheduleTemplateSaveSheetProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<SaveSheetMode>('actions')
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [pendingOverwriteTemplateId, setPendingOverwriteTemplateId] = useState<string | null>(null)

  const currentTemplate = useMemo(
    () => templates.find((template) => template.id === currentTemplateId) ?? null,
    [currentTemplateId, templates],
  )
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  )
  const pendingOverwriteTemplate = useMemo(
    () => templates.find((template) => template.id === pendingOverwriteTemplateId) ?? null,
    [pendingOverwriteTemplateId, templates],
  )

  function resetSheet() {
    setMode('actions')
    setTemplateName('')
    setSelectedTemplateId(null)
    setPendingOverwriteTemplateId(null)
  }

  function closeSheet() {
    resetSheet()
    onClose()
  }

  async function handleCreateTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const didCreate = await onCreateTemplate(templateName)
    if (didCreate) {
      closeSheet()
    }
  }

  async function confirmOverwriteTemplate() {
    if (!pendingOverwriteTemplateId) {
      return
    }

    const didOverwrite = await onOverwriteTemplate(pendingOverwriteTemplateId)
    if (didOverwrite) {
      closeSheet()
    }
  }

  const title =
    mode === 'create'
      ? t('schedule.createTemplateFromToday')
      : mode === 'overwrite'
        ? t('schedule.overwriteAnyTemplate')
        : t('schedule.saveTodayAsTemplate')

  return (
    <>
      <BottomSheet
        open={isOpen}
        title={title}
        description={t('schedule.saveTodayAsTemplateDescription', { count: exerciseCount })}
        onClose={closeSheet}
      >
        {mode === 'actions' ? (
          <div className="space-y-2">
            {currentTemplate ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setPendingOverwriteTemplateId(currentTemplate.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--surface-container)] disabled:opacity-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-container)] text-[var(--primary)]">
                  <RefreshCw size={18} strokeWidth={2.25} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium text-[var(--on-surface)]">
                    {t('schedule.overwriteCurrentTemplate')}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--on-surface-variant)]">
                    {currentTemplate.name}
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
                {t('schedule.createTemplateFromToday')}
              </span>
            </button>

            {templates.length > 0 ? (
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
                  {t('schedule.overwriteAnyTemplate')}
                </span>
              </button>
            ) : null}
          </div>
        ) : null}

        {mode === 'create' ? (
          <form className="mt-2 space-y-5" onSubmit={handleCreateTemplate}>
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
                {t('templates.templateName')}
              </span>
              <input
                value={templateName}
                disabled={isSubmitting}
                onChange={(event) => setTemplateName(event.target.value)}
                className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
                placeholder={t('templates.templatePlaceholder')}
              />
            </label>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !templateName.trim()}
                className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
              >
                {t('schedule.saveAsTemplate')}
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
              {t('schedule.selectTemplateToOverwrite')}
            </p>

            <div className="-mx-2 max-h-[42vh] space-y-1 overflow-y-auto px-2">
              {templates.map((template) => (
                <label
                  key={template.id}
                  className="flex cursor-pointer items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-[var(--surface-container)]"
                >
                  <input
                    type="radio"
                    name="overwriteTemplate"
                    checked={selectedTemplateId === template.id}
                    disabled={isSubmitting}
                    onChange={() => setSelectedTemplateId(template.id)}
                    className="h-5 w-5 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base text-[var(--on-surface)]">
                      {template.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--on-surface-variant)]">
                      {t('summary.exerciseCount', { count: template.exercises.length })}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={isSubmitting || !selectedTemplate}
                onClick={() => {
                  if (selectedTemplate) {
                    setPendingOverwriteTemplateId(selectedTemplate.id)
                  }
                }}
                className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
              >
                {t('schedule.overwriteTemplate')}
              </button>
            </div>
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={pendingOverwriteTemplate !== null}
        danger
        title={t('schedule.confirmOverwriteTemplateTitle')}
        description={
          pendingOverwriteTemplate
            ? t('schedule.confirmOverwriteTemplateDescription', {
                name: pendingOverwriteTemplate.name,
                count: exerciseCount,
              })
            : ''
        }
        confirmLabel={t('schedule.overwriteTemplate')}
        onCancel={() => setPendingOverwriteTemplateId(null)}
        onConfirm={() => void confirmOverwriteTemplate()}
      />
    </>
  )
}
