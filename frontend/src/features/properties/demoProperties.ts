import type { PropertyStatus } from '@/components/StatusBadge'

export type PropertyType = 'residential' | 'commercial' | 'mixed_use' | 'other'

export type Property = {
  id: string
  code: string
  name: string
  type: PropertyType
  city: string
  status: PropertyStatus
  documentCount: number
  nextExpiry: string | null // ISO date, YYYY-MM-DD
}

export const propertyTypeLabels: Record<PropertyType, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  mixed_use: 'Mixed use',
  other: 'Other',
}

export const demoProperties: Property[] = [
  { id: 'p1', code: 'PROP-001', name: 'Greenwood Residency', type: 'residential', city: 'Bengaluru', status: 'active', documentCount: 6, nextExpiry: '2026-12-18' },
  { id: 'p2', code: 'PROP-002', name: 'Skyline Apartments', type: 'residential', city: 'Pune', status: 'active', documentCount: 5, nextExpiry: '2026-12-12' },
  { id: 'p3', code: 'PROP-003', name: 'Harmony Heights', type: 'residential', city: 'Hyderabad', status: 'active', documentCount: 4, nextExpiry: '2026-12-29' },
  { id: 'p4', code: 'PROP-004', name: 'Riverside Court', type: 'residential', city: 'Mysuru', status: 'active', documentCount: 3, nextExpiry: '2027-03-15' },
  { id: 'p5', code: 'PROP-005', name: 'Northgate Business Centre', type: 'commercial', city: 'Bengaluru', status: 'active', documentCount: 7, nextExpiry: '2027-02-28' },
  { id: 'p6', code: 'PROP-006', name: 'Willow Park Residences', type: 'residential', city: 'Chennai', status: 'active', documentCount: 4, nextExpiry: '2027-05-30' },
  { id: 'p7', code: 'PROP-007', name: 'Harbour View Offices', type: 'commercial', city: 'Kochi', status: 'active', documentCount: 5, nextExpiry: '2027-08-11' },
  { id: 'p8', code: 'PROP-008', name: 'Cedar Lane Homes', type: 'residential', city: 'Coimbatore', status: 'inactive', documentCount: 2, nextExpiry: null },
  { id: 'p9', code: 'PROP-009', name: 'Westbridge House', type: 'mixed_use', city: 'Mumbai', status: 'active', documentCount: 3, nextExpiry: '2027-06-20' },
  { id: 'p10', code: 'PROP-010', name: 'Meadowfield Retail Units', type: 'commercial', city: 'Ahmedabad', status: 'archived', documentCount: 1, nextExpiry: null },
]

// Stand-in for the real API call. The short delay is simulated so we can see
// the loading state. Add ?demo=error or ?demo=empty to the page address to
// preview those states. This whole function is replaced when the backend exists.
export async function fetchDemoProperties(): Promise<Property[]> {
  await new Promise((resolve) => setTimeout(resolve, 700))
  const mode = new URLSearchParams(window.location.search).get('demo')
  if (mode === 'error') throw new Error('Demo error')
  if (mode === 'empty') return []
  return demoProperties
}