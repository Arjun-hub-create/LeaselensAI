import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Building2, ChevronLeft, ChevronRight, Search, SearchX } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { DemoBadge } from '@/components/DemoBadge'
import { GlassCard } from '@/components/GlassCard'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { StatusBadge } from '@/components/StatusBadge'
import type { PropertyStatus } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { useMe } from '@/features/auth/auth'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

import { propertyTypeLabels } from './demoProperties'
import { fetchProperties } from './propertiesApi'

const PAGE_SIZE = 25

type StatusFilter = 'all' | PropertyStatus

export function PropertiesPage() {
  const me = useMe()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [offset, setOffset] = useState(0)
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const query = useQuery({
    queryKey: ['properties', { q: debouncedSearch, status, offset }],
    queryFn: () =>
      fetchProperties({
        q: debouncedSearch,
        status: status === 'all' ? undefined : status,
        limit: PAGE_SIZE,
        offset,
      }),
    placeholderData: keepPreviousData,
    retry: false,
  })

  const data = query.data
  const hasFilters = debouncedSearch !== '' || status !== 'all'

  function clearFilters() {
    setSearch('')
    setStatus('all')
    setOffset(0)
  }

  let body: ReactNode
  if (query.isError && !data) {
    body = (
      <ErrorState
        title="Could not load properties"
        description="Something went wrong while loading your properties. You can try again."
        onRetry={() => query.refetch()}
      />
    )
  } else if (!data) {
    body = (
      <div className="space-y-3 p-4" role="status" aria-label="Loading properties">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  } else if (data.total === 0 && !hasFilters) {
    body = (
      <EmptyState
        icon={Building2}
        title="No properties yet"
        description="Properties you add will appear here. Adding properties from this screen arrives in a later step."
      />
    )
  } else if (data.items.length === 0) {
    body = (
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
    )
  } else {
    const from = data.offset + 1
    const to = data.offset + data.items.length
    body = (
      <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Properties</caption>
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-3 text-left font-medium">Property</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Type</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Location</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.property_code}</p>
                  </td>
                  <td className="px-4 py-3">{propertyTypeLabels[p.property_type]}</td>
                  <td className="px-4 py-3">
                    {[p.city, p.state_region].filter(Boolean).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border p-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Showing {from}–{to} of {data.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={to >= data.total}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <section className="pt-2">
        <h1 className="text-3xl font-semibold">Properties</h1>
        <p className="mt-2 text-muted-foreground">Browse and manage the properties in your workspace.</p>
        {me.data?.workspace.is_demo ? (
          <div className="mt-4">
            <DemoBadge />
          </div>
        ) : null}
      </section>

      <GlassCard>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setOffset(0)
              }}
              aria-label="Search properties by name, code or city"
              placeholder="Search by name, code or city"
              className="h-10 w-full rounded-xl border border-border bg-secondary pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter)
              setOffset(0)
            }}
            aria-label="Filter by status"
            className="h-10 rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {body}
      </GlassCard>
    </div>
  )
}