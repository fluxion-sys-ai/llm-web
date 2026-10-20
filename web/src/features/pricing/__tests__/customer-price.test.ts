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
import { describe, expect, it } from 'vitest'

import type {
  CustomerBenefits,
  Promotion,
} from '@/features/customer-pricing/types'

import { getCatalogTokenPrices } from '../lib/catalog-price'
import {
  getCustomerPriceMultiplier,
  resolveCustomerPrice,
} from '../lib/customer-price'
import {
  getDynamicDisplayGroupRatio,
  getDynamicPricingSummary,
} from '../lib/dynamic-price'
import { sortModels } from '../lib/filters'
import {
  formatFixedPrice,
  formatGroupPrice,
  formatPrice,
  formatRequestPrice,
} from '../lib/price'
import type { PricingModel } from '../types'

const model: PricingModel = {
  id: 1,
  model_name: 'GLM-5.3',
  quota_type: 0,
  model_ratio: 0.56,
  completion_ratio: 3.52 / 1.12,
  cache_ratio: 0.208 / 1.12,
  enable_groups: ['default', 'premium'],
  group_ratio: { default: 1, premium: 2 },
}
const grant: Promotion = {
  id: 1,
  user_id: 30,
  name: 'Offer',
  multiplier: 0.8,
  starts_at: 100,
  expires_at: 200,
  duration_seconds: 100,
  redeem_before: 0,
  created_at: 100,
  code_mask: '',
  status: 'active',
}
function benefits(overrides: Partial<CustomerBenefits> = {}): CustomerBenefits {
  return {
    user_id: 30,
    promotion_codes_enabled: true,
    model_prices: [],
    promotions: [grant],
    ...overrides,
  }
}

describe('viewer model-price resolution', () => {
  it('combines the exact custom rate with only the strongest active offer', () => {
    const resolved = resolveCustomerPrice(
      model.model_name,
      benefits({
        model_prices: [{ model_name: 'GLM-5.3', multiplier: 0.7 }],
        promotions: [grant, { ...grant, id: 2, multiplier: 0.9 }],
      }),
      150
    )
    expect(resolved.multiplier).toBeCloseTo(0.56)
    expect(resolved.promotionMultiplier).toBe(0.8)
    expect(resolved.promotionExpiresAt).toBe(200)
  })
  it('keeps the custom rate while account-level promotion discounts are disabled', () => {
    const resolved = resolveCustomerPrice(
      model.model_name,
      benefits({
        promotion_codes_enabled: false,
        model_prices: [{ model_name: 'GLM-5.3', multiplier: 1.2 }],
      }),
      150
    )
    expect(resolved.multiplier).toBe(1.2)
    expect(resolved.promotionMultiplier).toBe(1)
    expect(resolved.promotionExpiresAt).toBeUndefined()
  })
  it('does not guess billing aliases from lowercase names or suffixes', () => {
    const resolved = resolveCustomerPrice(
      'glm-5.3-thinking',
      benefits({
        promotion_codes_enabled: false,
        model_prices: [{ model_name: 'GLM-5.3', multiplier: 0.7 }],
      }),
      150
    )
    expect(resolved.multiplier).toBe(1)
  })
  it('excludes unredeemed, future, expired, disabled and revoked offers', () => {
    const resolved = resolveCustomerPrice(
      model.model_name,
      benefits({
        promotions: [
          { ...grant, id: 1, starts_at: 0 },
          { ...grant, id: 2, starts_at: 151 },
          { ...grant, id: 3, expires_at: 150 },
          { ...grant, id: 4, status: 'disabled' },
          { ...grant, id: 5, status: 'revoked' },
          { ...grant, id: 6, disabled_at: 140 },
          { ...grant, id: 7, revoked_at: 140 },
        ],
      }),
      150
    )
    expect(resolved.multiplier).toBe(1)
  })
  it('uses the lower grant ID for equal discounts, then falls back when it expires', () => {
    const value = benefits({
      promotions: [
        { ...grant, id: 3, multiplier: 0.7, expires_at: 190 },
        { ...grant, id: 2, multiplier: 0.7, expires_at: 160 },
        { ...grant, id: 4, multiplier: 0.9, expires_at: 300 },
      ],
    })
    expect(
      resolveCustomerPrice(model.model_name, value, 150).promotionExpiresAt
    ).toBe(160)
    expect(resolveCustomerPrice(model.model_name, value, 200).multiplier).toBe(
      0.9
    )
    expect(resolveCustomerPrice(model.model_name, value, 300).multiplier).toBe(
      1
    )
  })
})

describe('personalized model amounts', () => {
  const personal = {
    ...model,
    customer_price: resolveCustomerPrice('GLM-5.3', benefits(), 150),
  }
  it('applies a promotion once to catalog prices while preserving source rates', () => {
    const catalog = {
      ...personal,
      official_price: { input: 1.4, output: 4.4, cache: 0.26 },
    }
    const prices = getCatalogTokenPrices(catalog)
    expect(prices?.input).toBeCloseTo(0.896)
    expect(prices?.output).toBeCloseTo(2.816)
    expect(prices?.cache).toBeCloseTo(0.1664)
    expect(model.model_ratio).toBe(0.56)
  })
  it('uses the same multiplier for token, cache, fixed, selected-group and per-request prices', () => {
    expect(formatPrice(personal, 'input', 'M', false, 1, 1, 'premium')).toBe(
      '$1.792'
    )
    expect(
      formatGroupPrice(personal, 'premium', 'cache', 'M', false, 1, 1, {
        premium: 2,
      })
    ).toBe('$0.3328')
    const fixed = { ...personal, quota_type: 1, model_price: 5 }
    expect(formatRequestPrice(fixed)).toBe('$4')
    expect(
      formatFixedPrice(fixed, 'premium', false, 1, 1, { premium: 2 })
    ).toBe('$8')
  })
  it('uses live non-GLM rates and the selected group for a customer quote instead of the website reference', () => {
    const kimi = {
      ...personal,
      model_name: 'kimi-k3',
      model_ratio: 1.2,
      completion_ratio: 5,
      official_price: { input: 3, output: 15 },
    }
    expect(getCatalogTokenPrices(kimi, 'premium')?.input).toBeCloseTo(3.84)
    const custom = {
      ...kimi,
      customer_price: {
        modelMultiplier: 0.7,
        promotionMultiplier: 1,
        multiplier: 0.7,
      },
    }
    expect(getCatalogTokenPrices(custom, 'premium')?.input).toBeCloseTo(3.36)
  })
  it('applies non-twenty-percent discounts to expression rates and unit conversion', () => {
    const dynamic = {
      ...model,
      customer_price: resolveCustomerPrice(
        'GLM-5.3',
        benefits({ promotions: [{ ...grant, multiplier: 0.9 }] }),
        150
      ),
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("standard", p * 1.12 + cr * 0.208 + c * 3.52)',
    }
    const summary = getDynamicPricingSummary(dynamic, {
      tokenUnit: 'K',
      groupRatioMultiplier: getDynamicDisplayGroupRatio(dynamic, 'premium'),
    })
    expect(
      summary?.entries.find((entry) => entry.field === 'inputPrice')?.formatted
    ).toBe('$0.002016')
  })
  it('sorts by the displayed personal price rather than the public price', () => {
    const cheaper = { ...model, id: 2, model_name: 'Other', model_ratio: 0.5 }
    expect(
      sortModels([cheaper, personal], 'price-low').map(
        (item) => item.model_name
      )
    ).toEqual(['GLM-5.3', 'Other'])
  })
  it('does not apply account benefits to unpublished models', () => {
    expect(
      getCustomerPriceMultiplier({ ...personal, availability: 'coming_soon' })
    ).toBe(1)
    expect(
      getCustomerPriceMultiplier({ ...personal, pricing_status: 'pending' })
    ).toBe(1)
  })
})
