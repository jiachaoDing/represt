import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type PageHeaderProps = {
  actions?: ReactNode
  backTo?: string
  eyebrow?: string
  subtitle?: string
  title: string
}

export function PageHeader({
  actions,
  backTo,
  eyebrow,
  subtitle,
  title,
}: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-20 -mx-4 border-b border-[var(--outline-soft)] bg-[rgba(243,245,241,0.88)] px-4 pb-4 pt-2 backdrop-blur">
      <div className="flex items-start gap-3">
        {backTo ? (
          <Link
            to={backTo}
            className="mt-1 inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[var(--outline-soft)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--ink-secondary)]"
          >
            返回
          </Link>
        ) : null}

        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ink-tertiary)]">
              {eyebrow}
            </p>
          ) : null}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-[1.7rem] font-semibold tracking-[-0.03em] text-[var(--ink-primary)]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-[var(--ink-secondary)]">{subtitle}</p>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </div>
      </div>
    </header>
  )
}
