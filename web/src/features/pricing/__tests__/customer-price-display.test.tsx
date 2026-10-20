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
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ModelPriceCell } from '../components/model-price-cell'
import { PricingTable } from '../components/pricing-table'
import type { PricingModel } from '../types'

const model: PricingModel = {
  id: 1,
  model_name: 'GLM-5.3',
  quota_type: 0,
  model_ratio: 0.56,
  completion_ratio: 3.52 / 1.12,
  cache_ratio: 0.208 / 1.12,
  enable_groups: ['default'],
  group_ratio: { default: 1 },
  official_price: { input: 1.4, output: 4.4, cache: 0.26 },
  customer_price: {
    modelMultiplier: 1,
    promotionMultiplier: 0.8,
    multiplier: 0.8,
    promotionExpiresAt: 4_000_000_000,
  },
}
describe('customer prices alongside public discounts', () => {
  it('retains the public discount and official references alongside the extra discount and final prices', () => {
    render(<ModelPriceCell model={model} />)
    for (const amount of ['0.896', '2.816', '0.1664']) {
      expect(screen.getByText(amount)).toBeVisible()
    }
    expect(screen.getByText('Your price')).toBeVisible()
    expect(screen.getByText('20% off')).toBeVisible()
    expect(screen.getByText('Extra 20% off')).toBeVisible()
    expect(screen.getByText('1.40').tagName).toBe('S')
    expect(screen.getByText(/Expires:/)).toBeVisible()
  })
  it('derives a fractional discount badge and prices from the configured multiplier', () => {
    render(
      <ModelPriceCell
        model={{
          ...model,
          customer_price: {
            modelMultiplier: 1,
            promotionMultiplier: 0.875,
            multiplier: 0.875,
          },
        }}
      />
    )
    expect(screen.getByText('Extra 12.5% off')).toBeVisible()
    expect(screen.getByText('0.98')).toBeVisible()
  })
  it('shows custom pricing without advertising a promotion when discounts are disabled', () => {
    render(
      <ModelPriceCell
        model={{
          ...model,
          customer_price: {
            modelMultiplier: 0.7,
            promotionMultiplier: 1,
            multiplier: 0.7,
          },
        }}
      />
    )
    expect(screen.getByText('Custom rate: 0.7×')).toBeVisible()
    expect(screen.getByText('0.784')).toBeVisible()
    expect(screen.queryByText(/Extra/)).not.toBeInTheDocument()
  })
  it('uses personal cache prices in the separate pricing-table column', () => {
    render(<PricingTable models={[model]} />)
    const row = screen.getByRole('row', { name: /GLM-5.3/ })
    expect(within(row).getAllByText('0.1664')).toHaveLength(2)
  })
  it('shows both actual sources and multiplies them when custom pricing allows a promotion', () => {
    render(
      <ModelPriceCell
        model={{
          ...model,
          customer_price: {
            modelMultiplier: 0.7,
            promotionMultiplier: 0.9,
            multiplier: 0.63,
          },
        }}
      />
    )
    expect(screen.getByText('Custom rate: 0.7×')).toBeVisible()
    expect(screen.getByText('Extra 10% off')).toBeVisible()
    expect(screen.getByText('0.7056')).toBeVisible()
    expect(screen.getByText('20% off')).toBeVisible()
  })
  it('keeps ordinary public prices and labels after account benefits are removed', () => {
    const result = render(<ModelPriceCell model={model} />)
    result.rerender(
      <ModelPriceCell model={{ ...model, customer_price: undefined }} />
    )
    expect(screen.getByText('1.12')).toBeVisible()
    expect(screen.getByText('20% off')).toBeVisible()
    expect(screen.queryByText('Your price')).not.toBeInTheDocument()
    expect(screen.queryByText(/Extra/)).not.toBeInTheDocument()
  })
})
