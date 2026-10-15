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
import { api } from '@/lib/api'

export type DashboardSession = { url: string; expires_at: number }

type ObservabilityResponse = {
  success?: boolean
  data?: { enabled?: boolean; dashboard_enabled?: boolean }
}

export async function getObservabilityAvailability(signal?: AbortSignal) {
  const response = await api.get<ObservabilityResponse>('/api/observability', {
    signal,
    disableDuplicate: true,
    skipBusinessError: true,
    skipErrorHandler: true,
    validateStatus: (status) =>
      status === 404 || (status >= 200 && status < 300),
  })
  if (response.status === 404) return false
  return (
    response.data?.success === true &&
    response.data.data?.enabled === true &&
    response.data.data.dashboard_enabled === true
  )
}

export function getProtectedDashboardUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  // Only the proxy's provisioned dashboard routes may be embedded. In
  // particular, reject URL credentials, hostnames, encoded paths and traversal.
  if (
    !/^\/api\/observability\/grafana\/d\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?$/.test(
      value
    )
  ) {
    return null
  }
  return value
}

export async function createDashboardSession(
  signal?: AbortSignal
): Promise<DashboardSession> {
  const response = await api.post<{
    success?: boolean
    data?: { url?: unknown; expires_at?: unknown }
  }>(
    '/api/observability/session',
    {},
    {
      signal,
      skipBusinessError: true,
      skipErrorHandler: true,
    }
  )
  const data = response.data?.data
  const url = getProtectedDashboardUrl(data?.url)
  if (
    response.data?.success !== true ||
    !url ||
    typeof data?.expires_at !== 'number' ||
    !Number.isFinite(data.expires_at) ||
    data.expires_at * 1000 <= Date.now() + 5000
  ) {
    throw new Error('Invalid dashboard session')
  }
  return { url, expires_at: data.expires_at }
}
