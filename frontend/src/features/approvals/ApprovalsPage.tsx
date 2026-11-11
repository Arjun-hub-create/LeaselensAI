import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, FileSearch } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DocumentStatusBadge } from '@/components/DocumentStatusBadge'
import { GlassCard } from '@/components/GlassCard'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { documentTypeLabels, fetchDemoDocuments } from '@/features/documents/demoDocuments'
import { hasDemoReview } from '@/features/documents/demoReviews'

export function ApprovalsPage() {
  const query = useQuery({
    queryKey: ['documents'],
    queryFn: fetchDemoDocuments,
    retry: false,
  })

  const pending = (query.data ?? []).filter((d) => d.status === 'needs_review')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Items waiting for a human decision."
        demo
      />

      <GlassCard>
        <div className="border-b border-border p-4">
          <h2 className="text-lg font-semibold">Extraction reviews</h2>
          <p className="text-sm text-muted-foreground">Documents whose extracted fields need checking.</p>
        </div>

        {query.isPending ? (
          <div className="space-y-3 p-4" role="status" aria-label="Loading approvals">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            title="Could not load approvals"
            description="Something went wrong while loading. You can try again."
            onRetry={() => query.refetch()}
          />
        ) : pending.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Nothing waiting for review"
            description="Documents that need their fields checked will appear here."
          />
        ) : (
          <ul>
            {pending.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4 last:border-0"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium">{d.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {documentTypeLabels[d.type]} · {d.property}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <DocumentStatusBadge status={d.status} />
                  {hasDemoReview(d.id) ? (
                    <Link
                      to={`/documents/${d.id}/review`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5385F7] hover:underline"
                    >
                      <FileSearch className="size-4" />
                      Review
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <GlassCard>
        <div className="border-b border-border p-4">
          <h2 className="text-lg font-semibold">Agent and workflow proposals</h2>
          <p className="text-sm text-muted-foreground">Drafts and actions proposed by workflows or the agent.</p>
        </div>
        <EmptyState
          icon={ClipboardCheck}
          title="No proposals yet"
          description="Workflows and the agent are not connected yet. When they are, each proposal shows its evidence and exact content here for a person to approve or reject."
        />
      </GlassCard>
    </div>
  )
}