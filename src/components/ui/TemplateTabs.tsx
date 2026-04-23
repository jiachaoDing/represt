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
                'whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-colors tap-highlight-transparent',
                active
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--outline-variant)]/20',
                item.disabled ? 'opacity-45' : '',
              ].join(' ')}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
