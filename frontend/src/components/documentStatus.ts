import {
  Archive,
  CircleCheck,
  CircleX,
  Clock,
  FileSearch,
  LoaderCircle,
  ScanText,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type DocumentStatus =
  | 'uploaded'
  | 'queued'
  | 'processing'
  | 'needs_review'
  | 'ocr_required'
  | 'approved'
  | 'rejected'
  | 'failed'
  | 'archived'

export const documentStatusLabels: Record<DocumentStatus, string> = {
  uploaded: 'Uploaded',
  queued: 'Queued',
  processing: 'Processing',
  needs_review: 'Needs review',
  ocr_required: 'OCR required',
  approved: 'Approved',
  rejected: 'Rejected',
  failed: 'Failed',
  archived: 'Archived',
}

export const documentStatusStyles = {
  uploaded: { label: 'Uploaded', icon: Upload, className: 'bg-secondary text-muted-foreground' },
  queued: { label: 'Queued', icon: Clock, className: 'bg-[#0866F8]/15 text-[#7FA8FF]' },
  processing: { label: 'Processing', icon: LoaderCircle, className: 'bg-[#0866F8]/15 text-[#7FA8FF]' },
  needs_review: { label: 'Needs review', icon: FileSearch, className: 'bg-[#A948F6]/15 text-[#D9A8FF]' },
  ocr_required: { label: 'OCR required', icon: ScanText, className: 'bg-[#F97D0B]/15 text-[#FFA552]' },
  approved: { label: 'Approved', icon: CircleCheck, className: 'bg-[#0DBD9E]/15 text-[#3FE0C2]' },
  rejected: { label: 'Rejected', icon: CircleX, className: 'bg-destructive/15 text-[#FF8A8A]' },
  failed: { label: 'Failed', icon: TriangleAlert, className: 'bg-destructive/15 text-[#FF8A8A]' },
  archived: { label: 'Archived', icon: Archive, className: 'bg-secondary text-muted-foreground' },
} satisfies Record<DocumentStatus, { label: string; icon: LucideIcon; className: string }>
