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
import { useMemo } from 'react'

import { api } from '@/lib/api'

export type ModelServiceStatus = 'available' | 'unavailable' | 'unknown'

type ServiceStatusResponse = {
  success: boolean
  message?: string
  data: { models: Array<{ model_name: string; status: ModelServiceStatus }> }
}

export function useModelServiceStatuses(enabled = true) {
  const query = useQuery({
    queryKey: ['model-service-status'],
    queryFn: async () => {
      const { data } = await api.get<ServiceStatusResponse>(
        '/api/model-service-status'
      )
      if (!data.success) {
        throw new Error(data.message || 'Unable to load service status')
      }
      return data.data.models
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: false,
  })
  return useMemo(() => {
    const statuses = new Map<string, ModelServiceStatus>()
    // A failed refresh must not leave a stale green status on screen.
    if (!query.isError) {
      for (const model of query.data ?? []) {
        statuses.set(model.model_name, model.status)
      }
    }
    return statuses
  }, [query.data, query.isError])
}
