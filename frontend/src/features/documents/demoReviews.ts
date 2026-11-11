export type FieldStatus = 'pending' | 'approved' | 'rejected' | 'corrected'

export type ReviewField = {
  key: string
  label: string
  required: boolean
  value: string | null // null means "not found in the document"
  page: number | null
  quote: string | null
  warning?: { text: string; page: number; quote: string }
}

export type DemoReview = {
  documentId: string
  title: string
  property: string
  documentType: string
  pages: string[]
  fields: ReviewField[]
}

const FOOTER = 'Fictional sample document for demonstration only.'

const leaseReview: DemoReview = {
  documentId: 'd1',
  title: 'greenwood-lease-2026.pdf',
  property: 'Greenwood Residency',
  documentType: 'Lease',
  pages: [
    `RESIDENTIAL LEASE AGREEMENT

Lease reference: LS-GW-2026-014
Property: Greenwood Residency, Unit 4B, Bengaluru
Landlord: Northstar Property Group (fictional)
Tenant: A. Example (fictional)

Lease start date: 19 December 2025

${FOOTER} Page 1 of 3.`,
    `TERM AND RENT

Lease end date: 18 December 2026

Monthly rent: INR 42,000.00, payable on or before the 5th of each month.

The tenant shall keep the unit in good condition and report any damage promptly.

${FOOTER} Page 2 of 3.`,
    `RENEWAL

The tenant may request a renewal. A renewed term would end on 18 June 2027, subject to written agreement.

${FOOTER} Page 3 of 3.`,
  ],
  fields: [
    {
      key: 'lease_reference',
      label: 'Lease reference',
      required: true,
      value: 'LS-GW-2026-014',
      page: 1,
      quote: 'Lease reference: LS-GW-2026-014',
    },
    {
      key: 'start_date',
      label: 'Lease start date',
      required: true,
      value: '2025-12-19',
      page: 1,
      quote: 'Lease start date: 19 December 2025',
    },
    {
      key: 'end_date',
      label: 'Lease end date',
      required: true,
      value: '2026-12-18',
      page: 2,
      quote: 'Lease end date: 18 December 2026',
      warning: {
        text: 'Another date appears on page 3 (18 June 2027, a possible renewal). Check which one applies.',
        page: 3,
        quote: 'A renewed term would end on 18 June 2027',
      },
    },
    {
      key: 'rent_amount',
      label: 'Monthly rent',
      required: true,
      value: 'INR 42000.00',
      page: 2,
      quote: 'Monthly rent: INR 42,000.00',
    },
    {
      key: 'notice_period_days',
      label: 'Notice period (days)',
      required: false,
      value: null,
      page: null,
      quote: null,
    },
  ],
}

const certificateReview: DemoReview = {
  documentId: 'd4',
  title: 'skyline-fire-safety-certificate.pdf',
  property: 'Skyline Apartments',
  documentType: 'Compliance certificate',
  pages: [
    `FIRE SAFETY CERTIFICATE

Certificate reference: FS-2026-0887
Property: Skyline Apartments, Pune
Issued by: Example Fire Safety Board (fictional)

Date of issue: 13 December 2025
Valid until: 12 December 2026

${FOOTER} Page 1 of 1.`,
  ],
  fields: [
    {
      key: 'record_type',
      label: 'Record type',
      required: true,
      value: 'Fire safety certificate',
      page: 1,
      quote: 'FIRE SAFETY CERTIFICATE',
    },
    {
      key: 'reference_number',
      label: 'Reference number',
      required: true,
      value: 'FS-2026-0887',
      page: 1,
      quote: 'Certificate reference: FS-2026-0887',
    },
    {
      key: 'issued_at',
      label: 'Issue date',
      required: true,
      value: '2025-12-13',
      page: 1,
      quote: 'Date of issue: 13 December 2025',
    },
    {
      key: 'expires_at',
      label: 'Expiry date',
      required: true,
      value: '2026-12-12',
      page: 1,
      quote: 'Valid until: 12 December 2026',
    },
  ],
}

const reviews: DemoReview[] = [leaseReview, certificateReview]

export function getDemoReview(documentId: string): DemoReview | undefined {
  return reviews.find((r) => r.documentId === documentId)
}

export function hasDemoReview(documentId: string): boolean {
  return reviews.some((r) => r.documentId === documentId)
}