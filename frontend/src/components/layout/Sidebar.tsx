import { Building2, ChevronDown, Zap } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { navItems } from '@/app/navigation'
import { cn } from '@/lib/utils'

export function Sidebar() {
  return (
    <aside className="flex h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-[#0866F8] to-[#A948F6] shadow-[0_0_24px_rgba(169,72,246,0.45)]">
          <Building2 className="size-6 text-white" />
        </div>
        <div>
          <p className="text-lg font-semibold leading-tight">LeaseLens AI</p>
          <p className="text-xs text-muted-foreground">Property Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={`/${path}`}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-linear-to-r from-[#5537D3] to-[#1E2066] text-white shadow-[0_0_20px_rgba(85,55,211,0.35)]'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Promo card */}
       <div className="mx-4 mb-4 hidden shrink-0 rounded-2xl border border-sidebar-border bg-linear-to-br from-[#11174A] to-[#0A0F26] p-4 [@media(min-height:1000px)]:block">
        <Zap className="size-5 text-[#F97D0B]" />
        <p className="mt-2 text-sm font-medium">Smarter Property Management with AI</p>
      </div>

      {/* Profile */}
      <div className="mx-4 mb-4 flex shrink-0 items-center gap-3 rounded-2xl border border-sidebar-border p-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-[#5385F7] text-sm font-semibold text-white">
          AM
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Arjun M</p>
          <p className="truncate text-xs text-muted-foreground">Property Manager</p>
        </div>
        <ChevronDown className="size-4 text-muted-foreground" />
      </div>
    </aside>
  )
}