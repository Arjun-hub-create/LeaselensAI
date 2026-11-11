import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function GlassCard({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card/80 shadow-[0_0_30px_rgba(8,102,248,0.06)] backdrop-blur-sm',
        className,
      )}
      {...props}
    />
  )
}