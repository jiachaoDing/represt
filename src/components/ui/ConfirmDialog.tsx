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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 backdrop-blur-sm transition-opacity">
      <section className="w-full max-w-[20rem] rounded-[28px] bg-[var(--surface-container)] p-6 shadow-2xl">
        <h2 className="text-2xl font-normal text-[var(--on-surface)] mb-4">{title}</h2>
        <p className="text-sm tracking-wide text-[var(--on-surface-variant)] mb-6">{description}</p>
        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors tap-highlight-transparent"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              'rounded-full px-4 py-2.5 text-sm font-medium transition-colors tap-highlight-transparent',
              danger 
                ? 'text-[var(--error)] hover:bg-[var(--error)]/10' 
                : 'text-[var(--primary)] hover:bg-[var(--primary)]/10',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
