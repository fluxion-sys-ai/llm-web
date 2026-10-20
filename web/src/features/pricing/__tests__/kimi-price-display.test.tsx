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
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import type { CustomerBenefits } from '@/features/customer-pricing/types'
import { api } from '@/lib/api'

import { ModelCard } from '../components/model-card'
import { ModelDetailsContent } from '../components/model-details'
import { ModelPriceCell } from '../components/model-price-cell'
import { PricingTable } from '../components/pricing-table'
import { buildLlmCatalog } from '../lib/catalog'
import { resolveCustomerPrice } from '../lib/customer-price'
import type { PricingModel } from '../types'

vi.mock('@visactor/react-vchart', () => ({ VChart: () => null }))

const clients: QueryClient[] = []
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  vi.restoreAllMocks()
})

function kimiQuote(multiplier: number): PricingModel {
  const benefits: CustomerBenefits = {
    user_id: 30,
    promotion_codes_enabled: true,
    model_prices: [],
    promotions: [
      {
        id: 1,
        user_id: 30,
        name: 'Customer offer',
        multiplier,
        starts_at: 100,
        expires_at: 200,
        duration_seconds: 100,
        redeem_before: 0,
        created_at: 100,
        code_mask: '',
        status: 'active',
      },
    ],
  }
  const models = buildLlmCatalog({
    success: true,
    data: [
      {
        id: 2,
        model_name: 'kimi-k3',
        quota_type: 0,
        model_ratio: 1.2,
        completion_ratio: 5,
        cache_ratio: 0.1,
        billing_mode: 'tiered_expr',
        billing_expr: 'tier("standard", p * 2.4 + cr * 0.24 + c * 12)',
        enable_groups: ['default'],
        supported_endpoint_types: ['openai'],
        customer_price: resolveCustomerPrice('kimi-k3', benefits, 150),
      },
    ],
    group_ratio: { default: 1 },
    vendors: [],
    usable_group: {},
    supported_endpoint: {},
    auto_groups: [],
  }).models
  const model = models.find((item) => item.model_name === 'kimi-k3')
  if (!model) throw new Error('Expected connected Kimi catalog model')
  return model
}

const offers = [
  {
    multiplier: 0.9,
    label: 'Extra 10% off',
    amounts: ['2.16', '10.80', '0.216'],
  },
  {
    multiplier: 0.85,
    label: 'Extra 15% off',
    amounts: ['2.04', '10.20', '0.204'],
  },
]

it.each(offers)(
  'shows official rates, the base discount and $label on the model card',
  (offer) => {
    render(<ModelCard model={kimiQuote(offer.multiplier)} onClick={() => {}} />)
    const pricing = within(screen.getByRole('group', { name: 'Pricing' }))
    expect(pricing.getByText('Your price')).toBeVisible()
    for (const amount of offer.amounts) {
      expect(pricing.getByText(amount)).toBeVisible()
    }
    for (const official of ['3.00', '15.00', '0.30']) {
      expect(pricing.getByText(official).tagName).toBe('S')
    }
    expect(pricing.getByText('20% off')).toBeVisible()
    expect(pricing.getByText(offer.label)).toBeVisible()
  }
)

it.each(offers)(
  'shows the same $label price and cache amount in the pricing table',
  (offer) => {
    render(<PricingTable models={[kimiQuote(offer.multiplier)]} />)
    const row = within(screen.getByRole('row', { name: /Kimi K3/ }))
    expect(row.getByText(offer.amounts[0])).toBeVisible()
    expect(row.getByText(offer.amounts[1])).toBeVisible()
    expect(row.getAllByText(offer.amounts[2])).toHaveLength(2)
    expect(row.getByText('20% off')).toBeVisible()
    expect(row.getByText(offer.label)).toBeVisible()
  }
)

it.each(offers)('shows the same $label quote in model details', (offer) => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: { groups: [] } },
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  render(
    <QueryClientProvider client={client}>
      <ModelDetailsContent
        model={kimiQuote(offer.multiplier)}
        groupRatio={{ default: 1 }}
        usableGroup={{ default: { desc: '', ratio: 1 } }}
        endpointMap={{}}
        autoGroups={[]}
        priceRate={1}
        usdExchangeRate={1}
        tokenUnit='M'
      />
    </QueryClientProvider>
  )
  const pricing = within(screen.getByRole('region', { name: 'Pricing' }))
  for (const amount of offer.amounts) {
    expect(pricing.getByText(amount)).toBeVisible()
  }
  expect(pricing.getByText('20% off')).toBeVisible()
  expect(pricing.getByText(offer.label)).toBeVisible()
})

it('does not advertise a base discount when the backend base differs from the official discounted rate', () => {
  render(
    <ModelPriceCell
      model={{
        ...kimiQuote(0.9),
        billing_expr: 'tier("standard", p * 0.6 + cr * 0.1 + c * 3)',
      }}
    />
  )
  expect(screen.getByText('0.54')).toBeVisible()
  expect(screen.getByText('Extra 10% off')).toBeVisible()
  expect(screen.queryByText('20% off')).not.toBeInTheDocument()
})
