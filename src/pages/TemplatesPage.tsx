import { SectionCard } from '../components/ui/SectionCard'
import { CreateTemplateForm } from '../components/templates/CreateTemplateForm'
import { TemplateEditorItem } from '../components/templates/TemplateEditorItem'
import { useTemplatesPageData } from '../hooks/pages/useTemplatesPageData'

export function TemplatesPage() {
  const {
    error,
    expandedTemplateId,
    handleCreateExercise,
    handleCreateTemplate,
    handleDeleteExercise,
    handleDeleteTemplate,
    handleSaveExercise,
    handleSaveTemplateName,
    isLoading,
    isSubmitting,
    newTemplateName,
    setExpandedTemplateId,
    setNewTemplateName,
    templates,
  } = useTemplatesPageData()

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <CreateTemplateForm
        isSubmitting={isSubmitting}
        newTemplateName={newTemplateName}
        setNewTemplateName={setNewTemplateName}
        onSubmit={handleCreateTemplate}
      />

      <SectionCard
        title="模板列表"
        action={<span className="rounded border border-slate-300 px-2 py-1 text-xs">{templates.length} 个模板</span>}
      >
        {isLoading ? <p>正在读取模板数据...</p> : null}
        {!isLoading && templates.length === 0 ? <p>还没有模板。</p> : null}

        <div className="space-y-3">
          {templates.map((template) => (
            <TemplateEditorItem
              key={`${template.id}:${template.updatedAt}`}
              disabled={isSubmitting}
              expanded={expandedTemplateId === template.id}
              template={template}
              onCreateExercise={handleCreateExercise}
              onDeleteExercise={handleDeleteExercise}
              onDeleteTemplate={handleDeleteTemplate}
              onSaveExercise={handleSaveExercise}
              onSaveTemplateName={handleSaveTemplateName}
              onToggle={() =>
                setExpandedTemplateId((current) => (current === template.id ? null : template.id))
              }
            />
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
