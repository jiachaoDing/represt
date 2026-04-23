type ConfirmDialogProps = {
  confirmLabel: string
  danger?: boolean
  description: string
  onCancel: () => void
  onConfirm: () => void
  open: boolean
  title: string
}

export function ConfirmDialog({
  confirmLabel,
  danger,
  description,
  onCancel,
  onConfirm,
  open,
  title,
}: ConfirmDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(24,32,22,0.28)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
      <section className="w-full max-w-[26rem] rounded-[1.75rem] border border-[var(--outline-soft)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-lg font-semibold text-[var(--ink-primary)]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">{description}</p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-[var(--outline-soft)] px-4 py-3 text-sm font-medium text-[var(--ink-primary)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              'flex-1 rounded-full px-4 py-3 text-sm font-medium text-white',
              danger ? 'bg-[var(--danger)]' : 'bg-[var(--brand)]',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
