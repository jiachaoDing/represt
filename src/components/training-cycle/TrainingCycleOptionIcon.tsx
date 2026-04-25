import type { CSSProperties, ReactNode } from 'react'

type OptionIconProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function OptionIcon({ children, className = '', style }: OptionIconProps) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${className}`}
      style={style}
    >
      {children}
    </span>
  )
}

export function RestIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.4 15.2A8 8 0 0 1 8.8 3.6 8.5 8.5 0 1 0 20.4 15.2z" />
    </svg>
  )
}

export function TemplateIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 7h12M6 12h12M6 17h8" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7h.01M4 12h.01M4 17h.01" />
    </svg>
  )
}

export function DeleteIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 7h12" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 7V5h4v2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10l.5 8h7l.5-8" />
    </svg>
  )
}
