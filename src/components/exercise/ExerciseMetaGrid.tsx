type ExerciseMetaGridProps = {
  name: string
  restSeconds: number
}

export function ExerciseMetaGrid({ name, restSeconds }: ExerciseMetaGridProps) {
  return (
    <section className="px-5 pb-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[14px] text-[var(--on-surface-variant)]">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 5v14M18 5v14M8 12h8M4 7h4M16 7h4M4 17h4M16 17h4" />
          </svg>
          <p>动作名称: {name}</p>
        </div>
        <div className="flex items-center gap-2 text-[14px] text-[var(--on-surface-variant)]">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p>休息秒数: {restSeconds} 秒</p>
        </div>
      </div>
    </section>
  )
}
