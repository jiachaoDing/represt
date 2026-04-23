import type { PropsWithChildren, ReactNode } from 'react'

type SectionCardProps = PropsWithChildren<{
  title: string
  action?: ReactNode
}>

export function SectionCard({ title, action, children }: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {action}
      </div>
      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">{children}</div>
    </section>
  )
}
