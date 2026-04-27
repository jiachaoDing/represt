import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

type OverflowMenuItem = {
  danger?: boolean
  disabled?: boolean
  label: string
  onSelect: () => void
}

type OverflowMenuProps = {
  items: OverflowMenuItem[]
}

export function OverflowMenu({ items }: OverflowMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={t('common.moreActions')}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--on-surface-variant)]/10 tap-highlight-transparent"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1"/>
          <circle cx="12" cy="5" r="1"/>
          <circle cx="12" cy="19" r="1"/>
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-1 z-30 min-w-[140px] overflow-hidden rounded-xl bg-[var(--surface-container)] py-2 shadow-lg ring-1 ring-[var(--outline-variant)]/50 origin-top-right animate-in fade-in scale-95 duration-100">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className={[
                'flex w-full items-center px-4 py-3 text-left text-sm font-medium transition-colors tap-highlight-transparent',
                item.danger ? 'text-[var(--error)]' : 'text-[var(--on-surface)]',
                item.disabled ? 'opacity-40' : 'hover:bg-[var(--on-surface)]/10',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
