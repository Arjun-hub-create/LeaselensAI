import { Archive, CircleCheck, CirclePause } from 'lucide-react'

import { cn } from '@/lib/utils'

export type PropertyStatus = 'active' | 'inactive' | 'archived'

const styles = {
  active: { label: 'Active', icon: CircleCheck, className: 'bg-[#0DBD9E]/15 text-[#3FE0C2]' },
  inactive: { label: 'Inactive', icon: CirclePause, className: 'bg-[#F97D0B]/15 text-[#FFA552]' },
  archived: { label: 'Archived', icon: Archive, className: 'bg-secondary text-muted-foreground' },
} as const

export function StatusBadge({ status }: { status: PropertyStatus }) {
  const { label, icon: Icon, className } = styles[status]
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