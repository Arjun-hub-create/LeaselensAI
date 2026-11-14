import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, FileText, Search, SearchX } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { DemoBadge } from '@/components/DemoBadge'
import { DocumentStatusBadge } from '@/components/DocumentStatusBadge'
import { documentStatusLabels } from '@/components/documentStatus'
import type { DocumentStatus } from '@/components/documentStatus'
import { GlassCard } from '@/components/GlassCard'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useMe } from '@/features/auth/auth'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

import { documentTypeLabels } from './demoDocuments'
import type { DocumentType } from './demoDocuments'
import { fetchDocuments, formatFileSize } from './documentsApi'
import { UploadDropzone } from './UploadDropzone'

const PAGE_SIZE = 25

type StatusFilter = 'all' | DocumentStatus
type TypeFilter = 'all' | DocumentType

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function DocumentsPage() {
  const me = useMe()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [type, setType] = useState<TypeFilter>('all')
  const [offset, setOffset] = useState(0)
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const query = useQuery({
    queryKey: ['documents', 'list', { q: debouncedSearch, status, type, offset }],
    queryFn: () =>
      fetchDocuments({
        q: debouncedSearch,
        status: status === 'all' ? undefined : status,
        type: type === 'all' ? undefined : type,
        limit: PAGE_SIZE,
        offset,
      }),
    placeholderData: keepPreviousData,
    retry: false,
  })

  const canUpload = me.data?.role === 'admin' || me.data?.role === 'property_manager'
  const data = query.data
  const hasFilters = debouncedSearch !== '' || status !== 'all' || type !== 'all'

  function clearFilters() {
    setSearch('')
    setStatus('all')
    setType('all')
    setOffset(0)
  }

  const selectClass =
    'h-10 rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

  let body: ReactNode
  if (query.isError && !data) {
    body = (
      <ErrorState
        title="Could not load documents"
        description="Something went wrong while loading your documents. You can try again."
        onRetry={() => query.refetch()}
      />
    )
  } else if (!data) {
    body = (
      <div className="space-y-3 p-4" role="status" aria-label="Loading documents">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  } else if (data.total === 0 && !hasFilters) {
    body = (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Upload a PDF above. It will appear here with its processing status."
      />
    )
  } else if (data.items.length === 0) {
    body = (
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
    )
  } else {
    const from = data.offset + 1
    const to = data.offset + data.items.length
    body = (
      <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Documents</caption>
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-3 text-left font-medium">File</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Type</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Uploaded</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((d) => (
                <tr key={d.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="max-w-72 px-4 py-3">
                    <p className="break-words font-medium">{d.original_filename}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(d.file_size_bytes)}</p>
                  </td>
                  <td className="px-4 py-3">{documentTypeLabels[d.document_type]}</td>
                  <td className="px-4 py-3">{formatDate(d.created_at)}</td>
                  <td className="px-4 py-3">
                    <DocumentStatusBadge status={d.status} />
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
        <h1 className="text-3xl font-semibold">Documents</h1>
        <p className="mt-2 text-muted-foreground">Upload, extract and review your property documents.</p>
        {me.data?.workspace.is_demo ? (
          <div className="mt-4">
            <DemoBadge />
          </div>
        ) : null}
      </section>

      <UploadDropzone canUpload={canUpload} />

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
              aria-label="Search documents by file name"
              placeholder="Search by file name"
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
            onChange={(e) => {
              setType(e.target.value as TypeFilter)
              setOffset(0)
            }}
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
        </div>

        {body}
      </GlassCard>
    </div>
  )
}