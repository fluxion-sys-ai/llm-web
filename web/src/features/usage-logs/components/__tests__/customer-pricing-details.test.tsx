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
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { formatLogQuota } from '@/lib/format'

import { CustomerPricingDetails } from '../customer-pricing-details'

test('billing snapshot displays its original and charged costs and both multipliers', () => {
  render(
    <CustomerPricingDetails
      pricing={{
        model_multiplier: 0.7,
        promotion_multiplier: 0.8,
        multiplier: 0.56,
        base_quota: 1_000_000,
        charged_quota: 560_000,
      }}
    />
  )
  expect(
    screen.getByText('Model multiplier').nextElementSibling
  ).toHaveTextContent('0.7×')
  expect(
    screen.getByText('Promotion multiplier').nextElementSibling
  ).toHaveTextContent('0.8×')
  expect(
    screen.getByText('Original Cost').nextElementSibling
  ).toHaveTextContent(formatLogQuota(1_000_000))
  expect(screen.getByText('Charged Cost').nextElementSibling).toHaveTextContent(
    formatLogQuota(560_000)
  )
})

test('a refund snapshot without exact quota fields does not invent original or charged costs', () => {
  render(
    <CustomerPricingDetails
      pricing={{
        model_multiplier: 0.7,
        promotion_multiplier: 1,
        multiplier: 0.7,
      }}
    />
  )
  expect(
    screen.getByText('Final multiplier').nextElementSibling
  ).toHaveTextContent('0.7×')
  expect(screen.queryByText('Original Cost')).not.toBeInTheDocument()
  expect(screen.queryByText('Charged Cost')).not.toBeInTheDocument()
})
