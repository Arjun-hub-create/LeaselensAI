import { ChevronLeft, ChevronRight } from 'lucide-react'

import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'

type DocumentPreviewProps = {
  pages: string[]
  page: number // 1-based
  onPageChange: (page: number) => void
  highlight: string | null
}

function renderWithHighlight(text: string, highlight: string | null) {
  if (!highlight) return text
  const index = text.indexOf(highlight)
  if (index === -1) return text
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-[#F9D84A] px-0.5 text-[#1a1a1a]">{highlight}</mark>
      {text.slice(index + highlight.length)}
    </>
  )
}

export function DocumentPreview({ pages, page, onPageChange, highlight }: DocumentPreviewProps) {
  const total = pages.length

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Document</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-20 text-center text-sm text-muted-foreground" aria-live="polite">
            Page {page} of {total}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= total}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 min-h-96 rounded-lg bg-white p-8 text-sm leading-relaxed text-slate-800 shadow-inner">
        <p className="whitespace-pre-wrap font-serif">{renderWithHighlight(pages[page - 1], highlight)}</p>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Demo preview of the page text. Real PDF viewing arrives with the backend.
      </p>
    </GlassCard>
  )
}