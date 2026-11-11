import { Check, CircleCheck, CircleDashed, CircleX, FileSearch, Pencil, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { FieldStatus, ReviewField } from './demoReviews'

export type Decision = { status: FieldStatus; value: string | null; reason?: string }

type ReviewFieldRowProps = {
  field: ReviewField
  decision: Decision
  isActive: boolean
  onApprove: () => void
  onReject: (reason: string) => void
  onEdit: (value: string) => void
  onReset: () => void
  onShowEvidence: (page: number, quote: string) => void
}

const statusStyles = {
  pending: { label: 'Pending', icon: CircleDashed, className: 'bg-secondary text-muted-foreground' },
  approved: { label: 'Approved', icon: CircleCheck, className: 'bg-[#0DBD9E]/15 text-[#3FE0C2]' },
  corrected: { label: 'Corrected', icon: Pencil, className: 'bg-[#A948F6]/15 text-[#D9A8FF]' },
  rejected: { label: 'Rejected', icon: CircleX, className: 'bg-destructive/15 text-[#FF8A8A]' },
} as const

export function ReviewFieldRow({
  field,
  decision,
  isActive,
  onApprove,
  onReject,
  onEdit,
  onReset,
  onShowEvidence,
}: ReviewFieldRowProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'reject'>('view')
  const [draft, setDraft] = useState('')

  const status = statusStyles[decision.status]
  const StatusIcon = status.icon
  const missing = decision.value === null
  const inputClass =
    'h-9 min-w-0 flex-1 rounded-lg border border-border bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

  function startEdit() {
    setDraft(decision.value ?? '')
    setMode('edit')
  }

  function startReject() {
    setDraft('')
    setMode('reject')
  }

  function saveEdit() {
    if (draft.trim() === '') return
    onEdit(draft.trim())
    setMode('view')
  }

  function confirmReject() {
    if (draft.trim() === '') return
    onReject(draft.trim())
    setMode('view')
  }

  return (
    <li
      className={cn(
        'rounded-xl border border-border bg-secondary/30 p-4',
        isActive && 'border-[#A948F6] ring-1 ring-[#A948F6]/60',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {field.label}
            {field.required ? <span className="ml-1 text-[#F97D0B]">Required</span> : null}
          </p>
          {missing ? (
            <p className="mt-1 text-sm italic text-muted-foreground">Not found in the document</p>
          ) : (
            <p className="mt-1 break-words text-base font-medium">{decision.value}</p>
          )}
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
            status.className,
          )}
        >
          <StatusIcon className="size-3.5" />
          {status.label}
        </span>
      </div>

      {field.page !== null && field.quote !== null ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => onShowEvidence(field.page as number, field.quote as string)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5385F7] hover:underline"
          >
            <FileSearch className="size-4" />
            Show evidence on page {field.page}
          </button>
          <p className="mt-1 text-xs italic text-muted-foreground">“{field.quote}”</p>
        </div>
      ) : null}

      {field.warning ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#F97D0B]/10 p-3 text-sm text-[#FFA552]">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p>{field.warning.text}</p>
            <button
              type="button"
              onClick={() => onShowEvidence(field.warning!.page, field.warning!.quote)}
              className="mt-1 font-medium underline"
            >
              View page {field.warning.page}
            </button>
          </div>
        </div>
      ) : null}

      {decision.status === 'rejected' && decision.reason ? (
        <p className="mt-3 text-sm text-[#FF8A8A]">Reason: {decision.reason}</p>
      ) : null}

      {/* While pending: Approve, Edit, Reject */}
      {mode === 'view' && decision.status === 'pending' ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={onApprove} disabled={missing}>
            <Check className="size-4" />
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="size-4" />
            {missing ? 'Enter value' : 'Edit'}
          </Button>
          <Button size="sm" variant="outline" onClick={startReject} disabled={missing}>
            <X className="size-4" />
            Reject
          </Button>
        </div>
      ) : null}

      {/* Once decided: only a way to change the decision */}
      {mode === 'view' && decision.status !== 'pending' ? (
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={onReset}>
            Change decision
          </Button>
        </div>
      ) : null}

      {mode === 'edit' ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={`New value for ${field.label}`}
            className={inputClass}
          />
          <Button size="sm" onClick={saveEdit} disabled={draft.trim() === ''}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMode('view')}>
            Cancel
          </Button>
        </div>
      ) : null}

      {mode === 'reject' ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={`Reason for rejecting ${field.label}`}
            placeholder="Reason for rejecting"
            className={inputClass}
          />
          <Button size="sm" onClick={confirmReject} disabled={draft.trim() === ''}>
            Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMode('view')}>
            Cancel
          </Button>
        </div>
      ) : null}
    </li>
  )
}