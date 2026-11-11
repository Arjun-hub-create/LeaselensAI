import { documentStatusStyles, type DocumentStatus } from '@/components/documentStatus'
import { cn } from '@/lib/utils'

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const { label, icon: Icon, className } = documentStatusStyles[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        className,
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  )
}