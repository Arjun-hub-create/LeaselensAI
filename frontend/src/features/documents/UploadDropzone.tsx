import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, FileUp, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import type { DragEvent } from 'react'

import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

import { formatFileSize, uploadDocument } from './documentsApi'

const MAX_BYTES = 25 * 1024 * 1024 // the same limit the server enforces

// These checks only save a round trip. The server repeats every one of them and decides.
function checkFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'Only PDF files are supported.'
  if (file.size === 0) return 'This file is empty.'
  if (file.size > MAX_BYTES) {
    return `This file is ${formatFileSize(file.size)}. The limit is 25 MB.`
  }
  return null
}

export function UploadDropzone({ canUpload }: { canUpload: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const upload = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  function handleFiles(files: FileList | null) {
    if (!canUpload || !files || files.length === 0) return
    upload.reset()
    if (files.length > 1) {
      setLocalError('Please choose one file at a time.')
      return
    }
    const file = files[0]
    const problem = checkFile(file)
    if (problem) {
      setLocalError(problem)
      return
    }
    setLocalError(null)
    upload.mutate(file)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  const serverError = upload.isError
    ? upload.error instanceof ApiError
      ? upload.error.message
      : 'Could not reach the server. Check that the backend is running.'
    : null
  const errorMessage = localError ?? serverError
  const fileName = upload.variables?.name

  return (
    <GlassCard
      className={cn(
        'border-dashed p-6 text-center transition-colors',
        dragging && canUpload && 'border-[#A948F6] bg-[#5537D3]/10',
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
      <Button
        className="mt-4"
        onClick={() => inputRef.current?.click()}
        disabled={!canUpload || upload.isPending}
      >
        Choose PDF
      </Button>

      {!canUpload ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Your role can view documents but not upload them. Admins and property managers can upload.
        </p>
      ) : null}

      <div aria-live="polite" className="mt-4 min-h-6 text-sm">
        {upload.isPending ? (
          <p className="flex items-center justify-center gap-2 text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
            Uploading {fileName}...
          </p>
        ) : null}
        {upload.isSuccess && !errorMessage ? (
          <p className="flex items-center justify-center gap-2 text-[#3FE0C2]">
            <CircleCheck className="size-4" />
            {fileName} was uploaded and queued.
          </p>
        ) : null}
        {errorMessage ? (
          <p className="flex items-center justify-center gap-2 text-[#FF8A8A]">
            <TriangleAlert className="size-4" />
            {errorMessage}
          </p>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Files are stored on this computer. Reading and extracting them comes in the next step, so
        documents stay &quot;Queued&quot; for now.
      </p>
    </GlassCard>
  )
}