import { AnimatedDialog } from '../motion/AnimatedDialog'

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
  return (
    <AnimatedDialog open={open} onClose={onCancel}>
      <section className="w-full max-w-[20rem] rounded-[28px] bg-[var(--surface-container)] p-6 shadow-2xl">
        <h2 className="mb-4 text-2xl font-normal text-[var(--on-surface)]">{title}</h2>
        <p className="mb-6 text-sm tracking-wide text-[var(--on-surface-variant)]">{description}</p>
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2.5 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10 tap-highlight-transparent"
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
    </AnimatedDialog>
  )
}
