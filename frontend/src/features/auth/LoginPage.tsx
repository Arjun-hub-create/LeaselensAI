import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'

import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'

import { meQueryKey, useMe } from './auth'
import type { Me } from './auth'

export function LoginPage() {
  const me = useMe()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const login = useMutation({
    mutationFn: () => api<Me>('/auth/login', { method: 'POST', body: { email, password } }),
    onSuccess: (data) => {
      queryClient.setQueryData(meQueryKey, data)
    },
  })

  if (me.data) return <Navigate to="/dashboard" replace />
  if (me.isPending) return null

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (email.trim() === '' || password === '') return
    login.mutate()
  }

  const errorMessage = login.isError
    ? login.error instanceof ApiError
      ? login.error.message
      : 'Could not reach the server. Check that the backend is running.'
    : null

  const inputClass =
    'mt-1 h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <GlassCard className="w-full max-w-md p-8">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-[#0866F8] to-[#A948F6] shadow-[0_0_24px_rgba(169,72,246,0.45)]">
            <Building2 className="size-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">LeaseLens AI</p>
            <p className="text-xs text-muted-foreground">Property Intelligence</p>
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn property documents into structured, searchable and reviewable information.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {errorMessage ? (
            <p role="alert" className="text-sm text-[#FF8A8A]">
              {errorMessage}
            </p>
          ) : null}

          <Button type="submit" className="h-11 w-full" disabled={login.isPending}>
            {login.isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-xs text-muted-foreground">
          Demo environment with fictional data. Accounts are created by an administrator, not by self-registration.
        </p>
      </GlassCard>
    </main>
  )
}