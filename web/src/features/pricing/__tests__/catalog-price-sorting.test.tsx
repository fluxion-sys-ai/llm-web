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

import { PricingTable } from '../components/pricing-table'
import { SORT_OPTIONS } from '../constants'
import { sortModels } from '../lib/filters'
import type { PricingModel } from '../types'

const connected: PricingModel = {
  id: 1,
  model_name: 'connected-catalog-model',
  quota_type: 0,
  model_ratio: 100,
  completion_ratio: 4,
  cache_ratio: 0.5,
  enable_groups: ['default'],
  official_price: { input: 0.3, output: 1.2 },
}

describe('catalog price ordering', () => {
  it.each([SORT_OPTIONS.PRICE_LOW, SORT_OPTIONS.PRICE_HIGH])(
    'uses displayed input prices for %s irrespective of connection status',
    (sortBy) => {
      const unavailable: PricingModel = {
        ...connected,
        id: 2,
        model_name: 'unavailable-catalog-model',
        model_ratio: 0,
        availability: 'coming_soon',
        pricing_status: 'pending',
        official_price: { input: 1.4, output: 4.4 },
      }
      const live: PricingModel = {
        ...connected,
        id: 3,
        model_name: 'backend-priced-model',
        official_price: undefined,
        model_ratio: 0.2,
      }
      const unpriced: PricingModel = {
        ...unavailable,
        id: 4,
        model_name: 'unpriced-model',
        official_price: undefined,
      }
      const models = [unavailable, unpriced, live, connected]

      // Displayed inputs are 0.24, 0.40 and 1.12 USD / 1M tokens.
      const expected =
        sortBy === SORT_OPTIONS.PRICE_LOW
          ? [connected, live, unavailable, unpriced]
          : [unavailable, live, connected, unpriced]
      expect(sortModels(models, sortBy)).toEqual(expected)
      expect(models).toEqual([unavailable, unpriced, live, connected])
    }
  )

  it('does not mix a backend cached price into configured catalog pricing', () => {
    render(
      <PricingTable
        models={[
          connected,
          {
            ...connected,
            id: 2,
            model_name: 'backend-priced-model',
            official_price: undefined,
            model_ratio: 1,
          },
        ]}
      />
    )

    const headers = screen.getAllByRole('columnheader')
    const cachedColumn = headers.indexOf(
      screen.getByRole('columnheader', { name: 'Cached' })
    )
    const configuredRow = screen.getByRole('row', {
      name: /connected-catalog-model/,
    })
    const liveRow = screen.getByRole('row', { name: /backend-priced-model/ })

    expect(
      within(configuredRow).getAllByRole('cell')[cachedColumn]
    ).toHaveTextContent(/^—$/)
    expect(
      within(liveRow).getAllByRole('cell')[cachedColumn]
    ).toHaveTextContent('$1')
  })
})
