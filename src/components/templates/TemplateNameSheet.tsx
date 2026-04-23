import type { FormEvent } from 'react'

import { BottomSheet } from '../ui/BottomSheet'

type TemplateSheetMode = 'create' | 'rename' | null

type TemplateNameSheetProps = {
  createName: string
  isOpen: boolean
  isSubmitting: boolean
  mode: TemplateSheetMode
  renameName: string
  onClose: () => void
  onCreateNameChange: (value: string) => void
  onRenameNameChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function TemplateNameSheet({
  createName,
  isOpen,
  isSubmitting,
  mode,
  renameName,
  onClose,
  onCreateNameChange,
  onRenameNameChange,
  onSubmit,
}: TemplateNameSheetProps) {
  const value = mode === 'create' ? createName : renameName

  return (
    <BottomSheet
      open={isOpen}
      title={mode === 'create' ? '新增模板' : '编辑名称'}
      onClose={onClose}
    >
      <form className="mt-2 space-y-5" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
            模板名称
          </span>
          <input
            value={value}
            disabled={isSubmitting}
            onChange={(event) =>
              mode === 'create'
                ? onCreateNameChange(event.target.value)
                : onRenameNameChange(event.target.value)
            }
            className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
            placeholder="例如：推胸日"
          />
        </label>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !value.trim()}
            className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
          >
            {mode === 'create' ? '创建模板' : '保存'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
