import {
  Building2,
  CalendarClock,
  Check,
  FileText,
  IndianRupee,
  MessageCircle,
} from 'lucide-react'

export const demoKpis = [
  {
    id: 'kpi-properties',
    label: 'Total Properties',
    value: '24',
    trend: '+2 this month',
    trendKind: 'up' as const,
    icon: Building2,
    color: '#0866F8',
    spark: [10, 12, 11, 14, 13, 17, 20, 24],
  },
  {
    id: 'kpi-documents',
    label: 'Documents Processed',
    value: '342',
    trend: '+18%',
    trendKind: 'up' as const,
    icon: FileText,
    color: '#A948F6',
    spark: [40, 52, 48, 70, 66, 90, 110, 130],
  },
  {
    id: 'kpi-renewals',
    label: 'Upcoming Renewals',
    value: '3',
    trend: 'In 30 days',
    trendKind: 'warning' as const,
    icon: CalendarClock,
    color: '#0DBD9E',
    spark: [1, 1, 2, 2, 2, 3, 3, 3],
  },
  {
    id: 'kpi-revenue',
    label: 'Total Revenue',
    value: '₹4.8L',
    trend: '+12%',
    trendKind: 'up' as const,
    icon: IndianRupee,
    color: '#0DBD9E',
    spark: [2.2, 2.8, 2.9, 3.4, 3.9, 4.2, 4.5, 4.8],
  },
]

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

export const demoPropertyStatus = [
  { label: 'Active', count: 18, fill: '#0866F8' },
  { label: 'Inactive', count: 4, fill: '#0DBD9E' },
  { label: 'Archived', count: 2, fill: '#F97D0B' },
]

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