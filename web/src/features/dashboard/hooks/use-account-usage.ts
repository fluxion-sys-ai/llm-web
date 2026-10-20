/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

type AccountUsage = {
  id: number
  quota: number
  used_quota: number
  request_count: number
}

export function useAccountUsage() {
  const userId = useAuthStore((state) => state.auth.user?.id)
  const sessionId = useAuthStore((state) => state.auth.session?.sid)

  return useQuery({
    queryKey: ['account-usage', userId, sessionId],
    enabled: userId !== undefined,
    queryFn: async ({ signal }) => {
      try {
        const response = await api.get<{
          success: boolean
          data?: AccountUsage
        }>('/api/user/self', {
          signal,
          skipErrorHandler: true,
          skipBusinessError: true,
          // Keep cancellation of this poll separate from other profile requests.
          disableDuplicate: true,
        })
        const usage = response.data.data
        if (
          !response.data.success ||
          !usage ||
          usage.id !== userId ||
          !Number.isFinite(usage?.quota) ||
          !Number.isFinite(usage?.used_quota) ||
          !Number.isFinite(usage?.request_count)
        ) {
          throw new Error('Invalid account usage response')
        }
        const auth = useAuthStore.getState().auth
        if (
          !signal.aborted &&
          auth.user &&
          auth.user.id === userId &&
          auth.session?.sid === sessionId
        ) {
          // Refresh counters without overwriting concurrent profile or session changes.
          auth.setUser({
            ...auth.user,
            quota: usage.quota,
            used_quota: usage.used_quota,
            request_count: usage.request_count,
          })
        }
        return usage
      } catch (error) {
        // A background balance refresh must not redirect the page on a transient 500.
        throw new Error('Unable to refresh account usage', { cause: error })
      }
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: false,
  })
}
