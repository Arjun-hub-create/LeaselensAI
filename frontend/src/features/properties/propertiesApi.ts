import type { PropertyStatus } from '@/components/StatusBadge'
import { api } from '@/lib/api'

import type { PropertyType } from './demoProperties'

export type PropertyRow = {
  id: string
  property_code: string
  name: string
  property_type: PropertyType
  city: string
  state_region: string | null
  country_code: string
  status: PropertyStatus
  is_demo: boolean
}

export type PropertyPageData = {
  items: PropertyRow[]
  total: number
  limit: number
  offset: number
}

type FetchParams = {
  q: string
  status?: PropertyStatus
  limit: number
  offset: number
}

export function fetchProperties(params: FetchParams): Promise<PropertyPageData> {
  const search = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  })
  if (params.q) search.set('q', params.q)
  if (params.status) search.set('status', params.status)
  return api<PropertyPageData>(`/properties?${search.toString()}`)
}