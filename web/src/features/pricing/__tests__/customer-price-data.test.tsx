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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, test } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { useLlmCatalog } from '../hooks/use-llm-catalog'
import { usePricingData } from '../hooks/use-pricing-data'
import { getCatalogTokenPrices } from '../lib/catalog-price'
import type { PricingData } from '../types'

const clients: QueryClient[] = []
afterEach(() => {
  cleanup()
  clients.forEach((client) => client.clear())
  clients.length = 0
  useAuthStore.getState().auth.reset()
})

test('customer catalogs share the active benefit while admin/base consumers retain public rates', () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  })
  clients.push(client)
  const data: PricingData = {
    success: true,
    data: [
      {
        id: 1,
        model_name: 'GLM-5.3',
        quota_type: 0,
        model_ratio: 0.56,
        completion_ratio: 3.52 / 1.12,
        cache_ratio: 0.208 / 1.12,
        enable_groups: ['default'],
      },
    ],
    vendors: [],
    group_ratio: { default: 1 },
    usable_group: {},
    supported_endpoint: {},
    auto_groups: [],
  }
  client.setQueryData(['status'], {})
  client.setQueryData(['pricing', 30], data)
  client.setQueryData(['pricing'], data)
  const now = Math.floor(Date.now() / 1000)
  client.setQueryData(['customer-benefits', 30], {
    user_id: 30,
    promotion_codes_enabled: true,
    model_prices: [{ model_name: 'GLM-5.3', multiplier: 0.7 }],
    promotions: [
      {
        id: 1,
        user_id: 30,
        name: 'Offer',
        multiplier: 0.9,
        starts_at: now - 100,
        expires_at: now + 100,
        status: 'active',
      },
    ],
  })
  useAuthStore
    .getState()
    .auth.setUser({ id: 30, username: 'customer', role: 1 })
  const result = renderHook(
    () => ({ personal: useLlmCatalog(), base: usePricingData() }),
    {
      wrapper: (props: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
          {props.children}
        </QueryClientProvider>
      ),
    }
  ).result
  expect(
    getCatalogTokenPrices(result.current.personal.models[0])?.input
  ).toBeCloseTo(0.7056)
  expect(result.current.base.models[0].customer_price).toBeUndefined()
  act(() => useAuthStore.getState().auth.reset())
  expect(
    getCatalogTokenPrices(result.current.personal.models[0])?.input
  ).toBeCloseTo(1.12)
  expect(result.current.personal.models[0].customer_price).toBeUndefined()
})
