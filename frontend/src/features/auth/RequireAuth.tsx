import { Navigate, Outlet } from 'react-router-dom'

import { ErrorState, Skeleton } from '@/components/states'

import { useMe } from './auth'

export function RequireAuth() {
  const me = useMe()

  if (me.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center p-8" role="status" aria-label="Loading">
        <Skeleton className="h-10 w-48" />
      </div>
    )
  }

  if (me.isError) {
    return (
      <div className="flex min-h-svh items-center justify-center p-8">
        <ErrorState
          title="Cannot reach the server"
          description="The backend did not respond. Check that it is running, then try again."
          onRetry={() => me.refetch()}
        />
      </div>
    )
  }

  if (!me.data) return <Navigate to="/login" replace />

  return <Outlet />
}