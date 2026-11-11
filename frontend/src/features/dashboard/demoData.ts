import {
  Building2,
  CalendarClock,
  Check,
  FileText,
  IndianRupee,
  MessageCircle,
} from 'lucide-react'

import { demoDocuments } from '@/features/documents/demoDocuments'
import { demoProperties } from '@/features/properties/demoProperties'

// ---- Numbers computed from the same demo lists the other pages use ----

const today = new Date()
const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())

function daysUntil(iso: string) {
  return Math.round((new Date(`${iso}T00:00:00Z`).getTime() - todayUtc) / 86_400_000)
}

const propertiesByStatus = (status: string) => demoProperties.filter((p) => p.status === status).length
const documentsByStatus = (status: string) => demoDocuments.filter((d) => d.status === status).length

const expiriesSoon = demoProperties.filter((p) => {
  if (!p.nextExpiry) return false
  const days = daysUntil(p.nextExpiry)
  return days >= 0 && days <= 60
}).length

export const demoKpis = [
  {
    id: 'kpi-properties',
    label: 'Total Properties',
    value: String(demoProperties.length),
    trend: `${propertiesByStatus('active')} active`,
    trendKind: 'neutral' as const,
    icon: Building2,
    color: '#0866F8',
    spark: [4, 5, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'kpi-documents',
    label: 'Documents',
    value: String(demoDocuments.length),
    trend: `${documentsByStatus('approved')} approved · ${documentsByStatus('needs_review')} need review`,
    trendKind: 'neutral' as const,
    icon: FileText,
    color: '#A948F6',
    spark: [1, 2, 2, 4, 5, 6, 8, 10],
  },
  {
    id: 'kpi-expiries',
    label: 'Upcoming Expiries',
    value: String(expiriesSoon),
    trend: 'In the next 60 days',
    trendKind: 'warning' as const,
    icon: CalendarClock,
    color: '#0DBD9E',
    spark: [1, 1, 2, 2, 2, 3, 3, 3],
  },
  {
    id: 'kpi-revenue',
    label: 'Total Revenue',
    value: '₹4.8L',
    trend: 'Sample figure (demo)',
    trendKind: 'neutral' as const,
    icon: IndianRupee,
    color: '#0DBD9E',
    spark: [2.2, 2.8, 2.9, 3.4, 3.9, 4.2, 4.5, 4.8],
  },
]

export const demoPropertyStatus = [
  { label: 'Active', count: propertiesByStatus('active'), fill: '#0866F8' },
  { label: 'Inactive', count: propertiesByStatus('inactive'), fill: '#0DBD9E' },
  { label: 'Archived', count: propertiesByStatus('archived'), fill: '#F97D0B' },
]

// ---- Everything below is unchanged ----

// Last 6 calendar months, ending with the current month.
const revenueValues = [1.8, 2.8, 3.0, 3.7, 4.1, 4.8]
export const demoRevenueSeries = revenueValues.map((value, i) => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
  return { month: date.toLocaleString('en-US', { month: 'short' }), value }
})

export const demoActivity = [
  {
    id: 'act-1',
    title: 'Document processed successfully',
    meta: '2m ago • Lease Agreement',
    icon: FileText,
    color: '#A948F6',
  },
  {
    id: 'act-2',
    title: 'Property details updated',
    meta: '12m ago • Skyline Apartments',
    icon: Check,
    color: '#0DBD9E',
  },
  {
    id: 'act-3',
    title: 'Renewal reminder draft prepared',
    meta: '1h ago • Greenwood Residency',
    icon: CalendarClock,
    color: '#F97D0B',
  },
  {
    id: 'act-4',
    title: 'New question asked',
    meta: '2h ago • Knowledge Assistant',
    icon: MessageCircle,
    color: '#0866F8',
  },
]

export const demoChat = {
  question: 'Show me expiring leases next month...',
  answer: 'Here are 3 leases expiring next month:',
  leases: [
    { name: 'Skyline Apartments', date: '12 Dec 2026' },
    { name: 'Greenwood Residency', date: '18 Dec 2026' },
    { name: 'Harmony Heights', date: '29 Dec 2026' },
  ],
  source: 'Source: Lease Agreement, page 3 (demo)',
}

export const demoTasks = [
  {
    id: 'task-1',
    title: 'Review extracted fields',
    detail: 'Lease Agreement — Greenwood Residency',
    due: 'Today',
    to: '/documents',
  },
  {
    id: 'task-2',
    title: 'Approve reminder draft',
    detail: 'Greenwood Residency',
    due: 'Tomorrow',
    to: '/approvals',
  },
  {
    id: 'task-3',
    title: 'Insurance policy expires soon',
    detail: 'Skyline Apartments',
    due: 'Tomorrow',
    to: '/properties',
  },
]