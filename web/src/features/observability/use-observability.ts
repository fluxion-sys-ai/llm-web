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
import { useEffect, useState } from 'react'

import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import {
  createDashboardSession,
  getObservabilityAvailability,
  type DashboardSession,
} from './api'

export function useObservability() {
  const user = useAuthStore((state) => state.auth.user)
  const sid = useAuthStore((state) => state.auth.session?.sid)
  const isAdmin = (user?.role ?? ROLE.GUEST) >= ROLE.ADMIN
  const query = useQuery({
    queryKey: ['observability', user?.id, user?.role, sid],
    enabled: isAdmin,
    staleTime: 60_000,
    retry: false,
    queryFn: ({ signal }) => getObservabilityAvailability(signal),
  })
  return {
    ...query,
    available: isAdmin && !query.isError && query.data === true,
  }
}

export function useDashboardSession(enabled: boolean) {
  const user = useAuthStore((state) => state.auth.user)
  const sid = useAuthStore((state) => state.auth.session?.sid)
  const isAdmin = (user?.role ?? ROLE.GUEST) >= ROLE.ADMIN
  const active = enabled && isAdmin
  const [, updateExpiration] = useState(0)
  const session = useQuery<DashboardSession>({
    queryKey: ['observability-session', user?.id, user?.role, sid],
    enabled: active,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchIntervalInBackground: true,
    refetchInterval: (query) => {
      if (
        query.state.status === 'error' ||
        query.state.fetchStatus === 'fetching' ||
        !query.state.data
      ) {
        return false
      }
      return Math.max(
        1000,
        query.state.data.expires_at * 1000 - Date.now() - 30_000
      )
    },
    queryFn: ({ signal }) => createDashboardSession(signal),
  })
  const expiresAt = session.data?.expires_at
  const refetch = session.refetch

  useEffect(() => {
    if (!active || !expiresAt) return
    // Background timers can be throttled. Expiry also hides the frame while a
    // renewal is pending, so a suspended tab never retains an expired view.
    const timer = window.setTimeout(
      () => updateExpiration((value) => value + 1),
      Math.max(0, expiresAt * 1000 - Date.now())
    )
    return () => window.clearTimeout(timer)
  }, [active, expiresAt])

  useEffect(() => {
    if (!active) return
    const refresh = () => {
      if (document.visibilityState === 'visible') void refetch()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [active, refetch])

  const valid =
    active &&
    !session.isError &&
    session.data &&
    session.data.expires_at * 1000 > Date.now()
  return { ...session, url: valid && session.data ? session.data.url : null }
}
