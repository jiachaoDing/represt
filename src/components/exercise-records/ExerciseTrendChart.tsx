import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'

import type { ExerciseRecordTrendPoint } from '../../db/sessions'

type ExerciseTrendChartProps = {
  ariaLabel: string
  points: ExerciseRecordTrendPoint[]
  valueFormatter: (value: number) => string
}

function CustomTooltip({
  active,
  label,
  payload,
  valueFormatter,
}: Partial<TooltipContentProps<number, string>> & {
  valueFormatter: (value: number) => string
}) {
  const value = payload?.[0]?.value

  if (!active || typeof value !== 'number') {
    return null
  }

  return (
    <div className="rounded-xl bg-[var(--surface-container-high)] px-3 py-2 text-center shadow-lg ring-1 ring-[var(--outline-variant)]/30">
      <p className="text-[11px] font-medium text-[var(--on-surface-variant)]">{label}</p>
      <p className="mt-0.5 text-[13px] font-bold text-[var(--on-surface)]">{valueFormatter(value)}</p>
    </div>
  )
}

export function ExerciseTrendChart({ ariaLabel, points, valueFormatter }: ExerciseTrendChartProps) {
  return (
    <div className="h-48 w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="var(--outline-variant)" vertical={false} strokeOpacity={0.45} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--on-surface-variant)', fontSize: 11, fontWeight: 600 }}
          />
          <YAxis
            tickFormatter={(value) => valueFormatter(Number(value))}
            tickLine={false}
            axisLine={false}
            width={58}
            tick={{ fill: 'var(--on-surface-variant)', fontSize: 10, fontWeight: 600 }}
          />
          <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--plan-1)"
            strokeWidth={3}
            dot={{ r: 3, stroke: 'var(--plan-1)', strokeWidth: 2, fill: 'var(--surface)' }}
            activeDot={{ r: 5, stroke: 'var(--plan-1)', strokeWidth: 3, fill: 'var(--surface)' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
