import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type SettingsRowProps = {
  icon: LucideIcon
  label: string
  onClick?: () => void
  right?: ReactNode
  supporting?: string
}

export function SettingsRow({ icon: Icon, label, onClick, right, supporting }: SettingsRowProps) {
  const content = <>
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-container)] text-[var(--primary)]">
      <Icon size={19} strokeWidth={2.2} aria-hidden="true" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium text-[var(--on-surface)]">{label}</span>
      {supporting ? <span className="mt-0.5 block truncate text-xs text-[var(--on-surface-variant)]">{supporting}</span> : null}
    </span>
    {right ? <span className="shrink-0">{right}</span> : null}
  </>
  if (!onClick) return <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">{content}</div>
  return <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-container)]">
    {content}
  </button>
}
