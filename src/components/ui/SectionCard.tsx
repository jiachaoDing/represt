import type { PropsWithChildren, ReactNode } from 'react'

type SectionCardProps = PropsWithChildren<{
  title: string
  action?: ReactNode
}>

export function SectionCard({ title, action, children }: SectionCardProps) {
  return (
    <section className="space-y-3 rounded border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      <div className="space-y-3 text-sm text-slate-700">{children}</div>
    </section>
  )
}
