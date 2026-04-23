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

  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90 transform">
        <circle
          stroke="var(--primary-container)"
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
        <span className="text-[15px] font-bold text-[var(--primary)]">{percentage}%</span>
      </div>
    </div>
  )
}

export function ScheduleProgressCard({
  completedCount,
  totalCount,
}: ScheduleProgressCardProps) {
  return (
    <section className="mx-4 mb-6 mt-2 flex items-center justify-between rounded-[1.25rem] bg-[var(--surface)] p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-[var(--outline-variant)]/20">
      <div>
        <h2 className="text-[17px] font-bold text-[var(--on-surface)]">今日进度</h2>
        <p className="mt-1 text-[13px] text-[var(--on-surface-variant)]">
          已完成 {completedCount} 个动作，共 {totalCount} 个
        </p>
      </div>
      <ProgressRing completed={completedCount} total={totalCount} />
    </section>
  )
}
