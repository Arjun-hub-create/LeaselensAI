import { useQuery } from '@tanstack/react-query'
import { FileText, Search, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DemoBadge } from '@/components/DemoBadge'
import { DocumentStatusBadge } from '@/components/DocumentStatusBadge'
import { documentStatusLabels, type DocumentStatus } from '@/components/documentStatus'
import { GlassCard } from '@/components/GlassCard'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { Button } from '@/components/ui/button'

import { documentTypeLabels, fetchDemoDocuments } from './demoDocuments'
import type { DocumentType } from './demoDocuments'
import { UploadDropzone } from './UploadDropzone'
import { Link } from 'react-router-dom'
import { hasDemoReview } from './demoReviews'

type StatusFilter = 'all' | DocumentStatus
type TypeFilter = 'all' | DocumentType

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function DocumentsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [type, setType] = useState<TypeFilter>('all')

  const query = useQuery({
    queryKey: ['documents'],
    queryFn: fetchDemoDocuments,
    retry: false,
  })

  const filtered = useMemo(() => {
    const documents = query.data ?? []
    const term = search.trim().toLowerCase()
    return documents.filter((d) => {
      const matchesStatus = status === 'all' || d.status === status
      const matchesType = type === 'all' || d.type === type
      const matchesSearch =
        term === '' || [d.fileName, d.property].some((v) => v.toLowerCase().includes(term))
      return matchesStatus && matchesType && matchesSearch
    })
  }, [query.data, search, status, type])

  function clearFilters() {
    setSearch('')
    setStatus('all')
    setType('all')
  }

  const total = query.data?.length ?? 0
  const selectClass =
    'h-10 rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className="space-y-6">
      <section className="pt-2">
        <h1 className="text-3xl font-semibold">Documents</h1>
        <p className="mt-2 text-muted-foreground">Upload, extract and review your property documents.</p>
        <div className="mt-4">
          <DemoBadge />
        </div>
      </section>

      <UploadDropzone />

      <GlassCard>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search documents by file name or property"
              placeholder="Search by file name or property"
              className="h-10 w-full rounded-xl border border-border bg-secondary pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            aria-label="Filter by status"
            className={selectClass}
          >
            <option value="all">All statuses</option>
            {(Object.keys(documentStatusLabels) as DocumentStatus[]).map((s) => (
              <option key={s} value={s}>
                {documentStatusLabels[s]}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TypeFilter)}
            aria-label="Filter by document type"
            className={selectClass}
          >
            <option value="all">All types</option>
            {(Object.keys(documentTypeLabels) as DocumentType[]).map((t) => (
              <option key={t} value={t}>
                {documentTypeLabels[t]}
              </option>
            ))}
          </select>
          {query.data ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Showing {filtered.length} of {total}
            </p>
          ) : null}
        </div>

        {query.isPending ? (
          <div className="space-y-3 p-4" role="status" aria-label="Loading documents">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            title="Could not load documents"
            description="Something went wrong while loading your documents. You can try again."
            onRetry={() => query.refetch()}
          />
        ) : total === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Documents you upload will appear here with their processing status."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No documents match"
            description="Try a different search term or filter."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <caption className="sr-only">Documents (demo data)</caption>
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-3 text-left font-medium">File</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Property</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Type</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Uploaded</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="max-w-64 px-4 py-3">
                      <p className="break-words font-medium">{d.fileName}</p>
                    </td>
                    <td className="px-4 py-3">{d.property}</td>
                    <td className="px-4 py-3">{documentTypeLabels[d.type]}</td>
                    <td className="px-4 py-3">{formatDate(d.uploadedOn)}</td>
                    <td className="px-4 py-3">
                      <DocumentStatusBadge status={d.status} />
                      {d.note ? <p className="mt-1 text-xs text-muted-foreground">{d.note}</p> : null}
                      <td className="px-4 py-3 text-right">
  {hasDemoReview(d.id) ? (
    <Link
      to={`/documents/${d.id}/review`}
      className="text-sm font-medium text-[#5385F7] hover:underline"
    >
      Review
    </Link>
  ) : null}
</td>
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