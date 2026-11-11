import { CircleCheck, FileUp, TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import type { DragEvent } from 'react'

import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB, the limit in our security doc

type Result =
  | { kind: 'ok'; name: string; size: number }
  | { kind: 'error'; message: string }
  | null

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function checkFile(file: File): Result {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return { kind: 'error', message: 'Only PDF files are supported.' }
  }
  if (file.size === 0) {
    return { kind: 'error', message: 'This file is empty.' }
  }
  if (file.size > MAX_BYTES) {
    return { kind: 'error', message: `This file is ${formatSize(file.size)}. The limit is 25 MB.` }
  }
  return { kind: 'ok', name: file.name, size: file.size }
}

export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<Result>(null)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    if (files.length > 1) {
      setResult({ kind: 'error', message: 'Please choose one file at a time.' })
      return
    }
    setResult(checkFile(files[0]))
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  return (
    <GlassCard
      className={cn(
        'border-dashed p-6 text-center transition-colors',
        dragging && 'border-[#A948F6] bg-[#5537D3]/10',
      )}
      onDragOver={(e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#5537D3]/20 text-[#A948F6]">
        <FileUp className="size-7" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Upload a document</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Drag a PDF here, or choose one. PDF only, up to 25 MB.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <Button className="mt-4" onClick={() => inputRef.current?.click()}>
        Choose PDF
      </Button>

      <div aria-live="polite" className="mt-4 min-h-6 text-sm">
        {result?.kind === 'ok' && (
          <p className="flex items-center justify-center gap-2 text-[#3FE0C2]">
            <CircleCheck className="size-4" />
            {result.name} ({formatSize(result.size)}) looks valid.
          </p>
        )}
        {result?.kind === 'error' && (
          <p className="flex items-center justify-center gap-2 text-[#FF8A8A]">
            <TriangleAlert className="size-4" />
            {result.message}
          </p>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Demo only: nothing is uploaded or saved yet. Saving and processing arrive with the backend, which will
        also re-check every file.
      </p>
    </GlassCard>
  )
}