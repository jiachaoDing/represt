type TemplateTabItem = {
  disabled?: boolean
  id: string
  label: string
  meta?: string
}

type TemplateTabsProps = {
  items: TemplateTabItem[]
  onSelect: (id: string) => void
  selectedId: string | null
}

export function TemplateTabs({ items, onSelect, selectedId }: TemplateTabsProps) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 pt-3">
      <div className="flex min-w-max gap-2">
        {items.map((item) => {
          const active = item.id === selectedId

          return (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => onSelect(item.id)}
              className={[
                'min-w-[7.5rem] rounded-[1.35rem] border px-4 py-3 text-left transition',
                active
                  ? 'border-transparent bg-[var(--surface-accent)] text-[var(--brand-strong)]'
                  : 'border-[var(--outline-soft)] bg-[var(--surface-raised)] text-[var(--ink-primary)]',
                item.disabled ? 'opacity-45' : '',
              ].join(' ')}
            >
              <p className="text-sm font-medium">{item.label}</p>
              {item.meta ? (
                <p className="mt-1 text-xs text-[var(--ink-tertiary)]">{item.meta}</p>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
