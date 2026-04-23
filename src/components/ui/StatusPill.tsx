type StatusPillProps = {
  tone?: 'danger' | 'neutral' | 'positive'
  value: string
}

export function StatusPill({ tone = 'neutral', value }: StatusPillProps) {
  const className =
    tone === 'positive'
      ? 'bg-[var(--surface-accent)] text-[var(--brand-strong)]'
      : tone === 'danger'
        ? 'bg-[var(--surface-danger)] text-[var(--danger)]'
        : 'bg-[rgba(24,32,22,0.06)] text-[var(--ink-secondary)]'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {value}
    </span>
  )
}
