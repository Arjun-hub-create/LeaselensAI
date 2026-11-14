import { useQuery } from '@tanstack/react-query'

import { api, ApiError } from '@/lib/api'

export type Me = {
  user: { id: string; email: string; display_name: string }
  workspace: { id: string; name: string; is_demo: boolean }
  role: string
}

export const meQueryKey = ['me'] as const

/** The signed-in user, or null when signed out. Other failures (like a down server) are real errors. */
export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async (): Promise<Me | null> => {
      try {
        return await api<Me>('/auth/me')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    retry: false,
    staleTime: 60_000,
  })
}