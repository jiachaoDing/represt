type TrainingCycleEmptyStateProps = {
  isSubmitting: boolean
  onAddSlot: () => void
}

export function TrainingCycleEmptyState({ isSubmitting, onAddSlot }: TrainingCycleEmptyStateProps) {
  return (
    <section className="mx-4 mt-8 rounded-[1.5rem] border border-dashed border-[var(--outline-variant)] px-6 py-12 text-center text-[var(--on-surface-variant)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-container)] mb-4">
        <svg className="h-6 w-6 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-[16px] font-semibold text-[var(--on-surface)]">开启你的循环日程</h3>
      <p className="mt-2 text-sm leading-relaxed">
        循环日程让你不再受限于固定的星期几。<br />添加几天作为一个周期，即可按照顺序不断循环。
      </p>
      <button
        type="button"
        onClick={onAddSlot}
        disabled={isSubmitting}
        className="mx-auto mt-6 flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-[var(--on-primary)] shadow-[0_4px_12px_rgba(22,78,48,0.2)] transition-transform active:scale-95 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span className="font-medium text-[15px]">添加一天</span>
      </button>
    </section>
  )
}
