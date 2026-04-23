type ScheduleProgressCardProps = {
  completedCount: number
  totalCount: number
}

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const radius = 32
  const stroke = 6
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset =
    total === 0 ? circumference : circumference - (completed / total) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90 transform">
        <circle
          stroke="var(--surface-container)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="var(--primary)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xs font-semibold text-[var(--on-surface)]">{completed}</span>
      </div>
    </div>
  )
}

export function ScheduleProgressCard({
  completedCount,
  totalCount,
}: ScheduleProgressCardProps) {
  return (
    <section className="mx-4 mb-6 mt-2 flex items-center justify-between rounded-3xl bg-[var(--surface-container)] p-5">
      <div>
        <h2 className="text-xl font-medium text-[var(--on-surface)]">今日进度</h2>
        <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
          已完成 {completedCount} 个动作，共 {totalCount} 个
        </p>
      </div>
      <ProgressRing completed={completedCount} total={totalCount} />
    </section>
  )
}
