import { useQuery } from '@tanstack/react-query'
import { Building2, Search, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DemoBadge } from '@/components/DemoBadge'
import { GlassCard } from '@/components/GlassCard'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { StatusBadge } from '@/components/StatusBadge'
import type { PropertyStatus } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'

import { fetchDemoProperties, propertyTypeLabels } from './demoProperties'

type StatusFilter = 'all' | PropertyStatus

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function PropertiesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const query = useQuery({
    queryKey: ['properties'],
    queryFn: fetchDemoProperties,
    retry: false,
  })

  const filtered = useMemo(() => {
    const properties = query.data ?? []
    const term = search.trim().toLowerCase()
    return properties.filter((p) => {
      const matchesStatus = status === 'all' || p.status === status
      const matchesSearch =
        term === '' || [p.name, p.code, p.city].some((v) => v.toLowerCase().includes(term))
      return matchesStatus && matchesSearch
    })
  }, [query.data, search, status])

  function clearFilters() {
    setSearch('')
    setStatus('all')
  }

  const total = query.data?.length ?? 0

  return (
    <div className="space-y-6">
      <section className="pt-2">
        <h1 className="text-3xl font-semibold">Properties</h1>
        <p className="mt-2 text-muted-foreground">Browse and manage the properties in your workspace.</p>
        <div className="mt-4">
          <DemoBadge />
        </div>
      </section>

      <GlassCard>
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search properties by name, code or city"
              placeholder="Search by name, code or city"
              className="h-10 w-full rounded-xl border border-border bg-secondary pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            aria-label="Filter by status"
            className="h-10 rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
          {query.data ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Showing {filtered.length} of {total}
            </p>
          ) : null}
        </div>

        {/* Body: loading, error, empty, no-match, or the table */}
        {query.isPending ? (
          <div className="space-y-3 p-4" role="status" aria-label="Loading properties">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            title="Could not load properties"
            description="Something went wrong while loading your properties. You can try again."
            onRetry={() => query.refetch()}
          />
        ) : total === 0 ? (
          <EmptyState
            icon={Building2}
            title="No properties yet"
            description="Properties you add will appear here. Adding properties arrives with the backend."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No properties match"
            description="Try a different search term or status filter."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Properties (demo data)</caption>
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">Property</th>
                  <th scope="col" className="px-4 py-3 font-medium">Type</th>
                  <th scope="col" className="px-4 py-3 font-medium">Location</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Documents</th>
                  <th scope="col" className="px-4 py-3 font-medium">Next expiry</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.code}</p>
                    </td>
                    <td className="px-4 py-3">{propertyTypeLabels[p.type]}</td>
                    <td className="px-4 py-3">{p.city}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-right">{p.documentCount}</td>
                    <td className="px-4 py-3">
                      {p.nextExpiry ? formatDate(p.nextExpiry) : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}