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

import { officialPrices } from '../lib/catalog'
import {
  getCatalogTokenPrices,
  getPublicCatalogTokenPrices,
  hasCatalogDiscount,
} from '../lib/catalog-price'
import { resolveCustomerPrice } from '../lib/customer-price'
import type { PricingModel } from '../types'

const flash: PricingModel = {
  id: 53,
  model_name: 'GLM-5.3-Flash',
  quota_type: 0,
  model_ratio: 99,
  completion_ratio: 99,
  cache_ratio: 99,
  billing_mode: 'tiered_expr',
  billing_expr: 'tier("standard", p * 0.12 + cr * 0.024 + c * 0.40)',
  enable_groups: ['default'],
  group_ratio: { default: 1 },
  official_price: officialPrices['glm-5.3-flash'],
}

it('uses the independent Flash billing base and applies each customer multiplier once', () => {
  expect(getPublicCatalogTokenPrices(flash)).toEqual({
    input: 0.12,
    cache: 0.024,
    output: 0.4,
  })
  const customerPrices = getCatalogTokenPrices({
    ...flash,
    customer_price: {
      modelMultiplier: 0.7,
      promotionMultiplier: 0.9,
      multiplier: 0.63,
    },
  })
  expect(customerPrices?.input).toBeCloseTo(0.0756)
  expect(customerPrices?.cache).toBeCloseTo(0.01512)
  expect(customerPrices?.output).toBeCloseTo(0.252)
})

it('preserves explicit Flash backend pricing overrides without claiming the reference discount', () => {
  const override = {
    ...flash,
    billing_expr: 'tier("standard", p * 0.2 + cr * 0.01 + c * 0.8)',
  }
  const prices = getPublicCatalogTokenPrices(override)
  assert(prices)
  expect(prices).toEqual({ input: 0.2, cache: 0.01, output: 0.8 })
  expect(hasCatalogDiscount(override, prices)).toBe(false)
})

it('does not publish zero or reference-discount prices for an unregistered Flash entry', () => {
  expect(
    getCatalogTokenPrices({
      ...flash,
      availability: 'unavailable',
      pricing_status: 'pending',
    })
  ).toBeNull()
})

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
