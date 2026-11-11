import { ArrowRight, ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { GlassCard } from '@/components/GlassCard'
import { cn } from '@/lib/utils'

import { demoTasks } from './demoData'

export function UpcomingTasks() {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          <ClipboardCheck className="size-6 text-[#0DBD9E]" />
          Upcoming Tasks
        </h2>
        <Link
          to="/approvals"
          className="flex items-center gap-1 text-sm font-medium text-[#5385F7] hover:underline"
        >
          View All <ArrowRight className="size-4" />
        </Link>
      </div>

      <ul className="mt-4 space-y-2">
        {demoTasks.map((task) => (
          <li key={task.id}>
            <Link
              to={task.to}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/40 px-4 py-3 transition-colors hover:bg-secondary"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{task.title}</span>
                <span className="block text-xs text-muted-foreground">{task.detail}</span>
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-medium',
                  task.due === 'Today'
                    ? 'bg-[#A948F6]/20 text-[#D9A8FF]'
                    : 'bg-[#0866F8]/20 text-[#7FA8FF]',
                )}
              >
                {task.due}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">Demo data</p>
    </GlassCard>
  )
}