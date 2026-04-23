import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

type PageHeaderProps = {
  actions?: ReactNode
  backTo?: string
  subtitle?: string
  title: string
}

export function PageHeader({
  actions,
  backTo,
  subtitle,
  title,
}: PageHeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header 
      className={`sticky top-0 z-20 -mx-4 px-4 pt-2 transition-colors duration-200 ${
        scrolled ? 'bg-[var(--surface-container)]' : 'bg-[var(--surface)]'
      }`}
    >
      <div className="flex h-16 items-center gap-4">
        {backTo ? (
          <Link
            to={backTo}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[var(--on-surface)] transition-colors hover:bg-[var(--on-surface-variant)]/10"
            aria-label="返回"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
        ) : null}

        <div className="min-w-0 flex-1 flex flex-col justify-center py-1">
          <h1 className="truncate text-[22px] leading-7 font-normal text-[var(--on-surface)]">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-sm leading-5 text-[var(--on-surface-variant)]">{subtitle}</p>
          ) : null}
        </div>
        
        {actions ? <div className="shrink-0 flex items-center justify-end">{actions}</div> : null}
      </div>
    </header>
  )
}
