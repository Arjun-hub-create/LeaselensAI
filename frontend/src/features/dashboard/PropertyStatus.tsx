import { ArrowRight, Building2 } from 'lucide-react'
import { Pie, PieChart } from 'recharts'
import { Link } from 'react-router-dom'

import { GlassCard } from '@/components/GlassCard'

import { demoPropertyStatus } from './demoData'

export function PropertyStatus() {
  const total = demoPropertyStatus.reduce((sum, item) => sum + item.count, 0)

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          <Building2 className="size-6 text-[#5385F7]" />
          Property Status
        </h2>
        <Link
          to="/properties"
          className="flex items-center gap-1 text-sm font-medium text-[#5385F7] hover:underline"
        >
          View Details <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-6">
        {/* Donut. Fixed pixel size set inline so it never collapses. */}
        <div className="relative shrink-0" style={{ width: 176, height: 176 }}>
          <PieChart width={176} height={176}>
            <Pie
              data={demoPropertyStatus}
              dataKey="count"
              nameKey="label"
              innerRadius={58}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            />
          </PieChart>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold leading-none">{total}</span>
            <span className="mt-1 text-xs text-muted-foreground">Total</span>
          </div>
        </div>

        {/* The legend doubles as the readable data for the chart. */}
        <ul className="min-w-0 flex-1 space-y-3">
          {demoPropertyStatus.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block size-3 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                {item.label}
              </span>
              <span className="text-muted-foreground">
                {item.count} ({Math.round((item.count / total) * 100)}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Demo data</p>
    </GlassCard>
  )
}