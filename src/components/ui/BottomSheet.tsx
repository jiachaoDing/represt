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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[30rem] px-0 pb-0">
        <section className="max-h-[90vh] overflow-auto rounded-t-[28px] bg-[var(--surface-container)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl transition-transform duration-300">
          <div className="mx-auto mb-6 h-1 w-8 rounded-full bg-[var(--outline)]" />
          <div className="flex items-start justify-between gap-3 px-2">
            <div className="min-w-0">
              <h2 className="text-xl font-normal text-[var(--on-surface)]">{title}</h2>
              {description ? (
                <p className="mt-1 text-sm text-[var(--on-surface-variant)]">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--on-surface-variant)] hover:bg-[var(--on-surface)]/10 transition-colors"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="mt-4 px-2">{children}</div>
          {actions ? <div className="mt-5 px-2">{actions}</div> : null}
        </section>
      </div>
    </div>
  )
}
