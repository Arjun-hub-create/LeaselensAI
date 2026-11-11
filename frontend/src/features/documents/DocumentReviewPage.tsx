import { ArrowLeft, FileSearch } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { DemoBadge } from '@/components/DemoBadge'
import { GlassCard } from '@/components/GlassCard'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { getDemoReview } from './demoReviews'
import type { DemoReview, FieldStatus, ReviewField } from './demoReviews'
import { DocumentPreview } from './DocumentPreview'
import { ReviewFieldRow } from './ReviewFieldRow'
import type { Decision } from './ReviewFieldRow'

function initialDecisions(fields: ReviewField[]): Record<string, Decision> {
  return Object.fromEntries(
    fields.map((f) => [f.key, { status: 'pending' as FieldStatus, value: f.value }]),
  )
}

function ReviewScreen({ review }: { review: DemoReview }) {
  const [decisions, setDecisions] = useState(() => initialDecisions(review.fields))
  const [page, setPage] = useState(1)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [panel, setPanel] = useState<'document' | 'fields'>('fields')
  const [documentApproved, setDocumentApproved] = useState(false)

  function update(key: string, decision: Decision) {
    setDecisions((current) => ({ ...current, [key]: decision }))
  }

  function showEvidence(key: string, evidencePage: number, quote: string) {
    setPage(evidencePage)
    setHighlight(quote)
    setActiveKey(key)
    setPanel('document') // on narrow screens, jump to the document pane
  }

  const unresolved = review.fields.filter(
    (f) => f.required && decisions[f.key].status !== 'approved' && decisions[f.key].status !== 'corrected',
  )
  const canApprove = unresolved.length === 0 && !documentApproved

  return (
    <div className="space-y-6">
      <section className="pt-2">
        <Link
          to="/documents"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5385F7] hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to documents
        </Link>
        <h1 className="mt-3 break-words text-2xl font-semibold">{review.title}</h1>
        <p className="mt-1 text-muted-foreground">
          {review.documentType} · {review.property}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <DemoBadge />
          <span className="text-xs text-muted-foreground">Demo: your decisions are not saved.</span>
        </div>
      </section>

      {/* Pane switcher, visible only on narrow screens */}
      <div className="flex gap-2 lg:hidden">
        <Button
          variant={panel === 'document' ? 'default' : 'outline'}
          aria-pressed={panel === 'document'}
          onClick={() => setPanel('document')}
        >
          Document
        </Button>
        <Button
          variant={panel === 'fields' ? 'default' : 'outline'}
          aria-pressed={panel === 'fields'}
          onClick={() => setPanel('fields')}
        >
          Fields
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(panel === 'document' ? 'block' : 'hidden', 'lg:block')}>
          <DocumentPreview pages={review.pages} page={page} onPageChange={setPage} highlight={highlight} />
        </div>

        <div className={cn(panel === 'fields' ? 'block' : 'hidden', 'space-y-4 lg:block')}>
          <GlassCard className="p-4">
            <h2 className="text-base font-semibold">Extracted fields</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Check each value against the document. Only approved or corrected values are trusted.
            </p>
            <ul className="mt-4 space-y-3">
              {review.fields.map((field) => (
                <ReviewFieldRow
                  key={field.key}
                  field={field}
                  decision={decisions[field.key]}
                  isActive={activeKey === field.key}
                  onApprove={() => update(field.key, { status: 'approved', value: decisions[field.key].value })}
                  onReject={(reason) =>
                    update(field.key, { status: 'rejected', value: decisions[field.key].value, reason })
                  }
                  onEdit={(value) => update(field.key, { status: 'corrected', value })}
                  onReset={() => update(field.key, { status: 'pending', value: field.value })}
                  onShowEvidence={(p, q) => showEvidence(field.key, p, q)}
                />
              ))}
            </ul>
          </GlassCard>

          <GlassCard className="p-4">
            {documentApproved ? (
              <p role="status" className="text-sm font-medium text-[#3FE0C2]">
                Document approved (demo only, nothing was saved).
              </p>
            ) : (
              <>
                <Button onClick={() => setDocumentApproved(true)} disabled={!canApprove}>
                  Approve document
                </Button>
                {unresolved.length > 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
                    {unresolved.length} required {unresolved.length === 1 ? 'field still needs' : 'fields still need'} a
                    decision: approve or correct {unresolved.length === 1 ? 'it' : 'them'} first.
                  </p>
                ) : null}
              </>
            )}
          </GlassCard>

          <details className="rounded-2xl border border-border bg-card/80 p-4 text-sm">
            <summary className="cursor-pointer font-medium">Technical details</summary>
            <p className="mt-3 text-muted-foreground">
              Model tag, prompt version and run time will appear here from the real extraction run. Nothing is shown
              in this demo, so no model results are implied.
            </p>
          </details>
        </div>
      </div>
    </div>
  )
}

export function DocumentReviewPage() {
  const { documentId } = useParams()
  const review = documentId ? getDemoReview(documentId) : undefined

  if (!review) {
    return (
      <GlassCard className="mt-2">
        <EmptyState
          icon={FileSearch}
          title="No demo review for this document"
          description="Only two demo documents have a review screen."
          action={
            <Link to="/documents" className="text-sm font-medium text-[#5385F7] hover:underline">
              Back to documents
            </Link>
          }
        />
      </GlassCard>
    )
  }

  // key resets all review state when you move to a different document
  return <ReviewScreen key={review.documentId} review={review} />
}