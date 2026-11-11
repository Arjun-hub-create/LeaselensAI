import { DemoBadge } from '@/components/DemoBadge'
import { KpiCard } from '@/components/KpiCard'

import { AskPanel } from './AskPanel'
import { demoKpis } from './demoData'
import { PortfolioOverview } from './PortfolioOverview'
import { PropertyStatus } from './PropertyStatus'
import { RecentActivity } from './RecentActivity'
import { UpcomingTasks } from './UpcomingTasks'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="pt-2">
        <h1 className="text-4xl font-semibold">{greeting()}, Arjun! 👋</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Here's what's happening with your properties today.
        </p>
        <div className="mt-4 h-1 w-24 rounded-full bg-linear-to-r from-[#A948F6] to-transparent" />
        <div className="mt-4">
          <DemoBadge />
        </div>
      </section>

      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {demoKpis.map((kpi) => (
          <KpiCard key={kpi.id} {...kpi} />
        ))}
      </section>

      <section
        aria-label="Portfolio, activity and assistant"
        className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)]"
      >
        <PortfolioOverview />
        <RecentActivity />
        <AskPanel />
      </section>

      <section aria-label="Property status and tasks" className="grid gap-4 lg:grid-cols-2">
        <PropertyStatus />
        <UpcomingTasks />
      </section>
    </div>
  )
}