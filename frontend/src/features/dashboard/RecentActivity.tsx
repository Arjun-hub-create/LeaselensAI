import { ArrowRight, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

import { GlassCard } from '@/components/GlassCard'

import { demoActivity } from './demoData'

export function RecentActivity() {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          <Zap className="size-6 text-[#F97D0B]" />
          Recent Activity
        </h2>
        <Link
          to="/audit"
          className="flex items-center gap-1 text-sm font-medium text-[#5385F7] hover:underline"
        >
          View All <ArrowRight className="size-4" />
        </Link>
      </div>

      <ul className="mt-5 space-y-5">
        {demoActivity.map(({ id, title, meta, icon: Icon, color }) => (
          <li key={id} className="flex items-center gap-4">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}26`, color }}
            >
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{title}</p>
              <p className="truncate text-xs text-muted-foreground">{meta}</p>
            </div>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}