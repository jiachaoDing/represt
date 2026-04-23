import { useEffect, useRef, useState } from 'react'

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
        aria-label="更多操作"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[var(--outline-soft)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--ink-secondary)]"
      >
        菜单
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-[10rem] overflow-hidden rounded-[1.25rem] border border-[var(--outline-soft)] bg-[var(--surface-raised)] p-1 shadow-[var(--shadow-soft)]">
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
                'flex w-full items-center rounded-[1rem] px-4 py-3 text-left text-sm transition',
                item.danger ? 'text-[var(--danger)]' : 'text-[var(--ink-primary)]',
                item.disabled ? 'opacity-40' : 'hover:bg-[var(--surface-accent)]',
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
