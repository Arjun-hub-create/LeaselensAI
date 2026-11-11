import type { DocumentStatus } from '@/components/documentStatus'

export type DocumentType =
  | 'lease'
  | 'insurance_policy'
  | 'compliance_certificate'
  | 'inspection_report'
  | 'other'
  | 'unknown'

export type DemoDocument = {
  id: string
  fileName: string
  property: string
  type: DocumentType
  status: DocumentStatus
  uploadedOn: string // ISO date, YYYY-MM-DD
  note?: string
}

export const documentTypeLabels: Record<DocumentType, string> = {
  lease: 'Lease',
  insurance_policy: 'Insurance policy',
  compliance_certificate: 'Compliance certificate',
  inspection_report: 'Inspection report',
  other: 'Other',
  unknown: 'Unclassified',
}

export const demoDocuments: DemoDocument[] = [
  { id: 'd1', fileName: 'greenwood-lease-2026.pdf', property: 'Greenwood Residency', type: 'lease', status: 'needs_review', uploadedOn: '2026-11-10' },
  { id: 'd2', fileName: 'greenwood-insurance-certificate.pdf', property: 'Greenwood Residency', type: 'insurance_policy', status: 'approved', uploadedOn: '2026-11-03' },
  { id: 'd3', fileName: 'skyline-lease-agreement.pdf', property: 'Skyline Apartments', type: 'lease', status: 'approved', uploadedOn: '2026-10-28' },
  { id: 'd4', fileName: 'skyline-fire-safety-certificate.pdf', property: 'Skyline Apartments', type: 'compliance_certificate', status: 'needs_review', uploadedOn: '2026-11-09' },
  { id: 'd5', fileName: 'harmony-heights-inspection.pdf', property: 'Harmony Heights', type: 'inspection_report', status: 'approved', uploadedOn: '2026-10-20' },
  { id: 'd6', fileName: 'northgate-lease-pack.pdf', property: 'Northgate Business Centre', type: 'lease', status: 'processing', uploadedOn: '2026-11-11' },
  { id: 'd7', fileName: 'riverside-scan-0042.pdf', property: 'Riverside Court', type: 'unknown', status: 'ocr_required', uploadedOn: '2026-11-08', note: 'Scanned pages are not supported in this build.' },
  { id: 'd8', fileName: 'willow-park-insurance.pdf', property: 'Willow Park Residences', type: 'insurance_policy', status: 'queued', uploadedOn: '2026-11-11' },
  { id: 'd9', fileName: 'harbour-view-compliance.pdf', property: 'Harbour View Offices', type: 'compliance_certificate', status: 'failed', uploadedOn: '2026-11-07', note: 'Processing failed. Retry arrives with the backend.' },
  { id: 'd10', fileName: 'cedar-lane-notes.pdf', property: 'Cedar Lane Homes', type: 'other', status: 'rejected', uploadedOn: '2026-10-15' },
]

// Stand-in for the real API call. The delay is simulated so we can see the
// loading state. Add ?demo=error or ?demo=empty to the page address to
// preview those states. Replaced when the backend exists.
export async function fetchDemoDocuments(): Promise<DemoDocument[]> {
  await new Promise((resolve) => setTimeout(resolve, 700))
  const mode = new URLSearchParams(window.location.search).get('demo')
  if (mode === 'error') throw new Error('Demo error')
  if (mode === 'empty') return []
  return demoDocuments
}