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

import { api } from '@/lib/api'

import { DynamicPricingBreakdown } from '../components/dynamic-pricing-breakdown'
import { ModelCard } from '../components/model-card'
import { ModelDetailsContent } from '../components/model-details'
import type { PricingModel } from '../types'

vi.mock('@visactor/react-vchart', () => ({ VChart: () => null }))

const customModel: PricingModel = {
  id: 42,
  model_name: 'test-customer-model',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 2,
  cache_ratio: 0.1,
  create_cache_ratio: 0.2,
  enable_groups: ['default', 'premium'],
  group_ratio: { default: 1, premium: 2 },
  customer_price: {
    modelMultiplier: 0.7,
    promotionMultiplier: 0.5,
    multiplier: 0.35,
  },
}
const clients: QueryClient[] = []
afterEach(() => {
  cleanup()
  clients.forEach((client) => client.clear())
  clients.length = 0
  vi.restoreAllMocks()
})

function renderDetails(model: PricingModel) {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { data: { groups: [] } } })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  render(
    <QueryClientProvider client={client}>
      <ModelDetailsContent
        model={model}
        groupRatio={{ default: 1, premium: 2 }}
        usableGroup={{
          default: { desc: '', ratio: 1 },
          premium: { desc: '', ratio: 2 },
        }}
        endpointMap={{}}
        autoGroups={[]}
        priceRate={1}
        usdExchangeRate={1}
        tokenUnit='M'
        selectedGroup='premium'
      />
    </QueryClientProvider>
  )
  return within(screen.getByRole('region', { name: 'Pricing' }))
}

it('identifies personalized token card prices and applies the same benefit to cache', () => {
  render(<ModelCard model={customModel} onClick={() => {}} />)
  const pricing = within(screen.getByRole('group', { name: 'Pricing' }))
  expect(pricing.getByText('Your price')).toBeVisible()
  expect(pricing.getByText('Custom rate: 0.7×')).toBeVisible()
  expect(pricing.getByText('Extra 50% off')).toBeVisible()
  expect(pricing.getByText('$0.7', { exact: false })).toBeVisible()
  expect(pricing.getByText('$0.07', { exact: false })).toBeVisible()
})

it('shows the personalized fixed request price with the same customer label', () => {
  render(
    <ModelCard
      model={{ ...customModel, quota_type: 1, model_price: 10 }}
      onClick={() => {}}
    />
  )
  const pricing = within(screen.getByRole('group', { name: 'Pricing' }))
  expect(pricing.getByText('Your price')).toBeVisible()
  expect(pricing.getByText('$3.5', { exact: false })).toBeVisible()
})

it('discounts task unit prices and task example totals on cards together', () => {
  render(
    <ModelCard
      model={{
        ...customModel,
        billing_mode: 'tiered_expr',
        billing_expr: 'tier("video", u("seconds") * 2)',
        billing_usage_schema: {
          seconds: {
            type: 'number',
            unit: 'second',
            description: 'Video price',
          },
        },
        billing_usage_examples: [
          { label: 'Five seconds', facts: { seconds: 5 } },
        ],
      }}
      onClick={() => {}}
    />
  )
  const pricing = within(screen.getByRole('group', { name: 'Pricing' }))
  expect(pricing.getByText('Your price')).toBeVisible()
  expect(pricing.getByText('$0.7')).toBeVisible()
  expect(pricing.getByText('Five seconds ≈ $3.5')).toBeVisible()
})

it('uses selected group and personal benefits for all token detail prices', () => {
  const pricing = renderDetails(customModel)
  expect(pricing.getByText('Your price')).toBeVisible()
  expect(pricing.queryByText('Base Price')).not.toBeInTheDocument()
  expect(pricing.getByText('$1.4', { exact: false })).toBeVisible()
  expect(pricing.getByText('$2.8', { exact: false })).toBeVisible()
  expect(pricing.getByText('$0.14', { exact: false })).toBeVisible()
  expect(pricing.getByText('$0.28', { exact: false })).toBeVisible()
})

it('uses selected group and personal benefits for fixed request detail prices', () => {
  const pricing = renderDetails({
    ...customModel,
    quota_type: 1,
    model_price: 10,
  })
  expect(pricing.getByText('Your price')).toBeVisible()
  expect(pricing.getByText('$7')).toBeVisible()
})

it('keeps token detail summaries and tier rows on the same personal group price', () => {
  const pricing = renderDetails({
    ...customModel,
    billing_mode: 'tiered_expr',
    billing_expr: 'tier("standard", p * 2 + c * 4 + cr * 0.2)',
  })
  expect(pricing.getByText('Your price')).toBeVisible()
  expect(pricing.getByText('$1.4')).toBeVisible()
  expect(pricing.getAllByText('$1.4000')).toHaveLength(2)
  expect(pricing.getAllByText('$0.1400')).toHaveLength(2)
})

it('applies group and recharge conversion to token tier rows without changing default historical rows', () => {
  const expression = 'tier("standard", p * 2 + c * 4)'
  const { rerender } = render(
    <DynamicPricingBreakdown
      billingExpr={expression}
      taskPriceOptions={{
        groupRatioMultiplier: 0.7,
        showRechargePrice: true,
        priceRate: 1,
        usdExchangeRate: 2,
      }}
    />
  )
  expect(screen.getAllByText('$0.7000')).toHaveLength(2)
  expect(screen.getAllByText('$1.4000')).toHaveLength(2)
  rerender(
    <DynamicPricingBreakdown
      billingExpr={expression}
      matchedTierLabel='standard'
    />
  )
  expect(screen.getAllByText('$2.0000')).toHaveLength(2)
  expect(screen.getAllByText('$4.0000')).toHaveLength(2)
  expect(screen.queryByText('Your price')).not.toBeInTheDocument()
})

it('applies the same effective factor to task tier unit prices and additional charges', () => {
  render(
    <DynamicPricingBreakdown
      billingExpr='tier("video", 1 + u("seconds") * 2)'
      usageSchema={{
        seconds: { type: 'number', unit: 'second', description: 'Video price' },
      }}
      taskPriceOptions={{ groupRatioMultiplier: 0.7 }}
    />
  )
  expect(screen.getAllByText('$1.4/s')).toHaveLength(2)
  expect(screen.getAllByText('$0.7/request')).toHaveLength(2)
})
