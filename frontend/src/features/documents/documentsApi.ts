import type { DocumentStatus } from '@/components/documentStatus'
import { api } from '@/lib/api'

import type { DocumentType } from './demoDocuments'

export type DocumentRow = {
  id: string
  property_id: string | null
  original_filename: string
  file_size_bytes: number
  document_type: DocumentType
  status: DocumentStatus
  is_demo: boolean
  created_at: string
}

export type DocumentPageData = {
  items: DocumentRow[]
  total: number
  limit: number
  offset: number
}

export type UploadResult = {
  document_id: string
  job_id: string
  status: string
}

type FetchParams = {
  q: string
  status?: DocumentStatus
  type?: DocumentType
  limit: number
  offset: number
}

export function fetchDocuments(params: FetchParams): Promise<DocumentPageData> {
  const search = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  })
  if (params.q) search.set('q', params.q)
  if (params.status) search.set('status', params.status)
  if (params.type) search.set('document_type', params.type)
  return api<DocumentPageData>(`/documents?${search.toString()}`)
}

export function uploadDocument(file: File): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  return api<UploadResult>('/documents', { method: 'POST', body: form })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}