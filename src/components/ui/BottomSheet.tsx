import { useEffect, type PropsWithChildren, type ReactNode } from 'react'

type BottomSheetProps = PropsWithChildren<{
  actions?: ReactNode
  description?: string
  onClose: () => void
  open: boolean
  title: string
}>

export function BottomSheet({
  actions,
  children,
  description,
  onClose,
  open,
  title,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="关闭弹层"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(24,32,22,0.28)]"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[30rem] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <section className="max-h-[85vh] overflow-auto rounded-t-[1.75rem] border border-[var(--outline-soft)] bg-[var(--surface-raised)] px-4 pb-4 pt-3 shadow-[var(--shadow-soft)]">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--outline-strong)]" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--ink-primary)]">{title}</h2>
              {description ? (
                <p className="mt-1 text-sm text-[var(--ink-secondary)]">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[var(--outline-soft)] px-3 text-sm text-[var(--ink-secondary)]"
            >
              关闭
            </button>
          </div>
          <div className="mt-4 space-y-4">{children}</div>
          {actions ? <div className="mt-5">{actions}</div> : null}
        </section>
      </div>
    </div>
  )
}
