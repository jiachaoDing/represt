import type { FormEvent } from 'react'

import { SectionCard } from '../ui/SectionCard'

type CreateTemplateFormProps = {
  isSubmitting: boolean
  newTemplateName: string
  setNewTemplateName: (value: string) => void
  onSubmit: () => Promise<void>
}

export function CreateTemplateForm({
  isSubmitting,
  newTemplateName,
  setNewTemplateName,
  onSubmit,
}: CreateTemplateFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit()
  }

  return (
    <SectionCard title="新建模板">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block space-y-1">
          <span className="text-xs text-slate-500">模板名称</span>
          <input
            value={newTemplateName}
            onChange={(event) => setNewTemplateName(event.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded border border-slate-900 bg-slate-900 px-3 py-2 text-sm text-white disabled:border-slate-300 disabled:bg-slate-300"
        >
          新建模板
        </button>
      </form>
    </SectionCard>
  )
}
