import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, LogOut, Zap } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

import { navItems } from '@/app/navigation'
import { useMe } from '@/features/auth/auth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type SidebarProps = {
  className?: string
  onNavigate?: () => void
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  property_manager: 'Property Manager',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const me = useMe()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const logout = useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      // Whether or not the server call worked, forget everything locally and go to login.
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })

  const user = me.data?.user
  const role = me.data?.role

  return (
    <aside
      className={cn(
        'flex h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar',
        className,
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-[#0866F8] to-[#A948F6] shadow-[0_0_24px_rgba(169,72,246,0.45)]">
          <Building2 className="size-6 text-white" />
        </div>
        <div>
          <p className="text-lg font-semibold leading-tight">LeaseLens AI</p>
          <p className="text-xs text-muted-foreground">Property Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-1">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={`/${path}`}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
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

      {/* Signed-in user */}
      <div className="mx-4 mb-4 shrink-0 rounded-2xl border border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-[#5385F7] text-sm font-semibold text-white">
            {user ? initials(user.display_name) : '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.display_name ?? 'Signed in'}</p>
            <p className="truncate text-xs text-muted-foreground">
              {role ? (roleLabels[role] ?? role) : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}