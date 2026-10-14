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
import { describe, expect, it, vi } from 'vitest'

import { ModelCard } from '../components/model-card'
import { ModelPriceCell } from '../components/model-price-cell'
import { PricingTable } from '../components/pricing-table'
import { SORT_OPTIONS } from '../constants'
import { officialPrices } from '../lib/catalog'
import { sortModels } from '../lib/filters'
import type { PricingModel } from '../types'

const glm: PricingModel = {
  id: 1,
  model_name: 'GLM-5.3',
  quota_type: 0,
  model_ratio: 37.5,
  completion_ratio: 1,
  enable_groups: ['default'],
  group_ratio: { default: 1 },
  official_price: officialPrices['glm-5.3'],
  billing_mode: 'tiered_expr',
  billing_expr: 'tier("standard", p * 1.12 + cr * 0.208 + c * 3.52)',
}

describe('GLM backend-aligned pricing', () => {
  it('shows the actual full rate without advertising a discount when the backend charges official prices', () => {
    render(
      <ModelPriceCell
        model={{
          ...glm,
          billing_expr: 'tier("standard", p * 1.4 + cr * 0.26 + c * 4.4)',
        }}
      />
    )
    expect(screen.getByText('1.40')).toBeVisible()
    expect(screen.getByText('0.26')).toBeVisible()
    expect(screen.getByText('4.40')).toBeVisible()
    expect(screen.queryByText('20% off')).not.toBeInTheDocument()
    expect(screen.queryByText('1.12')).not.toBeInTheDocument()
  })

  it('shows all three discounted backend rates and official comparisons without applying a second discount', () => {
    render(<ModelPriceCell model={glm} />)
    for (const rate of ['1.12', '0.208', '3.52']) {
      expect(screen.getByText(rate)).toBeVisible()
    }
    for (const rate of ['1.40', '0.26', '4.40']) {
      expect(screen.getByText(rate).tagName).toBe('S')
    }
    expect(screen.getByText('Cache Read')).toBeVisible()
    expect(screen.getByText('20% off')).toBeVisible()
    expect(screen.queryByText('0.21')).not.toBeInTheDocument()
  })

  it('gives the third cache metric a full row so its sale and official prices stay together', () => {
    render(<ModelPriceCell model={glm} />)
    expect(screen.getByText('Cache Read').parentElement).toHaveClass(
      'col-span-2'
    )
    expect(screen.getByText('Input').parentElement).not.toHaveClass(
      'col-span-2'
    )
  })

  it('uses the selected group for model cards rather than the cheapest group', () => {
    render(
      <ModelCard
        model={{
          ...glm,
          enable_groups: ['default', 'vip'],
          group_ratio: { default: 1, vip: 2 },
        }}
        selectedGroup='vip'
        onClick={vi.fn()}
      />
    )
    const pricing = within(screen.getByRole('group', { name: 'Pricing' }))
    expect(pricing.getByText('2.24')).toBeVisible()
    expect(pricing.getByText('0.416')).toBeVisible()
    expect(pricing.getByText('7.04')).toBeVisible()
    expect(pricing.queryByText('20% off')).not.toBeInTheDocument()
  })

  it('recognizes the discount when an effective group multiplier supplies the twenty percent reduction', () => {
    render(
      <ModelPriceCell
        model={{
          ...glm,
          billing_expr: 'tier("standard", p * 1.4 + cr * 0.26 + c * 4.4)',
          group_ratio: { default: 0.8 },
        }}
      />
    )
    expect(screen.getByText('1.12')).toBeVisible()
    expect(screen.getByText('0.208')).toBeVisible()
    expect(screen.getByText('20% off')).toBeVisible()
  })

  it('reads ratio billing when configured and preserves the cache rate precision', () => {
    render(
      <ModelPriceCell
        model={{
          ...glm,
          billing_mode: undefined,
          billing_expr: undefined,
          model_ratio: 0.56,
          completion_ratio: 3.52 / 1.12,
          cache_ratio: 0.208 / 1.12,
        }}
      />
    )
    expect(screen.getByText('1.12')).toBeVisible()
    expect(screen.getByText('0.208')).toBeVisible()
    expect(screen.getByText('3.52')).toBeVisible()
    expect(screen.getByText('20% off')).toBeVisible()
  })

  it('does not infer a cached rate or a blanket discount when cache pricing is absent', () => {
    render(
      <ModelPriceCell
        model={{
          ...glm,
          billing_expr: 'tier("standard", p * 1.12 + c * 3.52)',
        }}
      />
    )
    expect(screen.getByText('1.12')).toBeVisible()
    expect(screen.queryByText('0.208')).not.toBeInTheDocument()
    expect(screen.queryByText('20% off')).not.toBeInTheDocument()
  })

  it.each([
    { billing_expr: '' },
    {
      billing_expr:
        'max(tier("standard", p * 1.12 + cr * 0.208 + c * 3.52), 1)',
    },
    {
      billing_expr:
        'p > 1000 ? tier("long", p * 2 + c * 4) : tier("standard", p * 1.12 + cr * 0.208 + c * 3.52)',
    },
    { pricing_status: 'pending' as const },
  ])(
    'does not publish a fabricated discount for unavailable or unsupported live billing: %o',
    (change) => {
      render(<ModelPriceCell model={{ ...glm, ...change }} />)
      expect(screen.queryByText('20% off')).not.toBeInTheDocument()
      expect(screen.queryByText('1.12')).not.toBeInTheDocument()
      expect(screen.queryByText('75')).not.toBeInTheDocument()
    }
  )

  it('retains the announced discount and cache price while the model is coming soon', () => {
    render(
      <ModelPriceCell
        model={{
          ...glm,
          availability: 'coming_soon',
          pricing_status: 'pending',
          enable_groups: [],
        }}
      />
    )
    expect(screen.getByText('1.12')).toBeVisible()
    expect(screen.getByText('0.208')).toBeVisible()
    expect(screen.getByText('20% off')).toBeVisible()
  })

  it('uses the actual expression input rate for catalog price sorting', () => {
    const other = {
      ...glm,
      id: 2,
      model_name: 'other',
      official_price: { input: 1.5, output: 4 },
      billing_expr: undefined,
    }
    const fullPrice = {
      ...glm,
      billing_expr: 'tier("standard", p * 1.4 + cr * 0.26 + c * 4.4)',
    }
    expect(sortModels([fullPrice, other], SORT_OPTIONS.PRICE_LOW)).toEqual([
      other,
      fullPrice,
    ])
  })

  it('sorts by the selected group rate rather than the cheapest group', () => {
    const model = {
      ...glm,
      enable_groups: ['default', 'vip'],
      group_ratio: { default: 1, vip: 2 },
    }
    const other = {
      ...glm,
      id: 2,
      model_name: 'other',
      official_price: { input: 2, output: 4 },
    }
    expect(sortModels([model, other], SORT_OPTIONS.PRICE_LOW, 'vip')).toEqual([
      other,
      model,
    ])
  })

  it('shows the actual cached rate in the table cached column', () => {
    render(<PricingTable models={[glm]} />)
    const cachedIndex = screen
      .getAllByRole('columnheader')
      .indexOf(screen.getByRole('columnheader', { name: 'Cached' }))
    const row = screen.getByRole('row', { name: /GLM-5.3/ })
    const cacheCell = within(row).getAllByRole('cell')[cachedIndex]
    expect(cacheCell).toHaveTextContent('0.208')
    expect(cacheCell).not.toHaveTextContent('0.21')
  })
})
