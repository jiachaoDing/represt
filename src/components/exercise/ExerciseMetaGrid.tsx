type ExerciseMetaGridProps = {
  name: string
  restSeconds: number
}

export function ExerciseMetaGrid({ name, restSeconds }: ExerciseMetaGridProps) {
  return (
    <section className="mt-4 grid grid-cols-2 gap-3 px-4">
      <div className="rounded-2xl border border-[var(--outline-variant)] px-5 py-4">
        <p className="text-xs font-medium text-[var(--on-surface-variant)]">当前动作</p>
        <p className="mt-1 truncate text-sm font-medium text-[var(--on-surface)]">{name}</p>
      </div>
      <div className="rounded-2xl border border-[var(--outline-variant)] px-5 py-4">
        <p className="text-xs font-medium text-[var(--on-surface-variant)]">休息设置</p>
        <p className="mt-1 text-sm font-medium text-[var(--on-surface)]">{restSeconds} 秒</p>
      </div>
    </section>
  )
}
