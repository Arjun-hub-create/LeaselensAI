import { QueryCache, QueryClient } from '@tanstack/react-query'

import { meQueryKey } from '@/features/auth/auth'
import { ApiError } from '@/lib/api'

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    // If any data request says "not signed in", mark the user as signed out.
    // The route guard then sends them to the login page.
    onError: (error, query) => {
      if (
        error instanceof ApiError &&
        error.status === 401 &&
        query.queryKey[0] !== meQueryKey[0]
      ) {
        queryClient.setQueryData(meQueryKey, null)
      }
    },
  }),
})