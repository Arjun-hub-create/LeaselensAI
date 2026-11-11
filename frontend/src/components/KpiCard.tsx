import type { LucideIcon } from 'lucide-react'
import { ArrowUp, Clock, Info } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

import { GlassCard } from '@/components/GlassCard'

type KpiCardProps = {
  id: string
  label: string
  value: string
  trend: string
  trendKind: 'up' | 'warning' | 'neutral'
  icon: LucideIcon
  color: string
  spark: number[]
}

const trendStyles = {
  up: { icon: ArrowUp, color: '#0DBD9E' },
  warning: { icon: Clock, color: '#F97D0B' },
  neutral: { icon: Info, color: '#8991B7' },
} as const

export function KpiCard({ id, label, value, trend, trendKind, icon: Icon, color, spark }: KpiCardProps) {
  const data = spark.map((v, i) => ({ i, v }))
  const { icon: TrendIcon, color: trendColor } = trendStyles[trendKind]

  return (
    <GlassCard className="p-5">
      <div className="flex items-start gap-4">
        <div
          className="flex size-14 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${color}26`, color }}
        >
          <Icon className="size-7" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold leading-none">{value}</p>
          <p className="mt-3 flex items-center gap-1 text-sm" style={{ color: trendColor }}>
            <TrendIcon className="size-4 shrink-0" />
            {trend}
          </p>
        </div>
      </div>

      {/* Chart has its own row, so it never overlaps the text */}
      <div aria-hidden="true" className="mt-4 h-14 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#${id})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}