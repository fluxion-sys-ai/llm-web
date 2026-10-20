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
import { assert, expect, it } from 'vitest'

import type { CustomerBenefits } from '@/features/customer-pricing/types'

import { getCatalogTokenPrices } from '../lib/catalog-price'
import { resolveCustomerPrice } from '../lib/customer-price'
import type { PricingModel } from '../types'

it('keeps the same catalog base when a promotion activates and expires despite different backend rates', () => {
  const model: PricingModel = {
    id: 2,
    model_name: 'kimi-k3',
    quota_type: 0,
    model_ratio: 0.3,
    completion_ratio: 5,
    cache_ratio: 1 / 6,
    billing_mode: 'tiered_expr',
    billing_expr: 'tier("standard", p * 0.6 + cr * 0.1 + c * 3)',
    enable_groups: ['default'],
    group_ratio: { default: 1 },
    official_price: { input: 3, output: 15 },
  }
  const benefits: CustomerBenefits = {
    user_id: 30,
    promotion_codes_enabled: true,
    model_prices: [],
    promotions: [
      {
        id: 1,
        user_id: 30,
        name: 'Ten percent offer',
        multiplier: 0.9,
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

  const before = getCatalogTokenPrices({
    ...model,
    customer_price: resolveCustomerPrice(model.model_name, benefits, 99),
  })
  const active = getCatalogTokenPrices({
    ...model,
    customer_price: resolveCustomerPrice(model.model_name, benefits, 150),
  })
  const expired = getCatalogTokenPrices({
    ...model,
    customer_price: resolveCustomerPrice(model.model_name, benefits, 200),
  })

  assert(before?.input !== undefined && before.output !== undefined)
  expect(expired).toEqual(before)
  expect(active?.input).toBeCloseTo(before.input * 0.9)
  expect(active?.output).toBeCloseTo(before.output * 0.9)
})
