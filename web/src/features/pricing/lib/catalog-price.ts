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
import { OFFICIAL_PRICE_DISCOUNT_PERCENT } from '../constants'
import type { PricingModel } from '../types'
import { parseTiersFromExpr } from './billing-expr'
import { getCustomerPriceMultiplier } from './customer-price'
import { getDisplayGroupRatio } from './model-helpers'
import { calculateTokenPrice } from './price'

export const CATALOG_PRICE_TYPES = ['input', 'output', 'cache'] as const
export type CatalogPriceType = (typeof CATALOG_PRICE_TYPES)[number]
export type CatalogTokenPrices = Partial<Record<CatalogPriceType, number>>

export function usesBackendCatalogPricing(model: PricingModel): boolean {
  return (
    model.availability !== 'coming_soon' &&
    (Boolean(model.official_price) ||
      model.model_name.toLowerCase() === 'glm-5.3')
  )
}

/** Read only complete, unconditional linear rates; never fall back to stale ratios for expressions. */
function getBackendTokenPrices(
  model: PricingModel,
  selectedGroup?: string
): CatalogTokenPrices | null {
  if (model.pricing_status === 'pending' || model.quota_type !== 0) return null
  const groupRatio = getDisplayGroupRatio(model, selectedGroup)
  if (!Number.isFinite(groupRatio) || groupRatio < 0) return null

  if (model.billing_mode === 'tiered_expr') {
    const tiers = parseTiersFromExpr(model.billing_expr ?? '')
    const tier = tiers[0]
    if (
      tiers.length !== 1 ||
      !tier ||
      tier.conditions.length > 0 ||
      Object.keys(tier).some(
        (key) =>
          ![
            'label',
            'conditions',
            'inputPrice',
            'outputPrice',
            'cacheReadPrice',
          ].includes(key)
      )
    ) {
      return null
    }
    const prices: CatalogTokenPrices = {}
    const fields = {
      input: 'inputPrice',
      output: 'outputPrice',
      cache: 'cacheReadPrice',
    } as const
    for (const type of CATALOG_PRICE_TYPES) {
      const value = tier[fields[type]]
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        prices[type] = value * groupRatio
      }
    }
    return Object.keys(prices).length > 0 ? prices : null
  }
  if (model.billing_mode && model.billing_mode !== 'ratio') return null
  const prices: CatalogTokenPrices = {}
  for (const type of CATALOG_PRICE_TYPES) {
    const value = calculateTokenPrice(model, type, groupRatio)
    if (Number.isFinite(value) && value >= 0) prices[type] = value
  }
  return Object.keys(prices).length > 0 ? prices : null
}

export function getCatalogTokenPrices(
  model: PricingModel,
  selectedGroup?: string
): CatalogTokenPrices | null {
  const prices = getPublicCatalogTokenPrices(model, selectedGroup)
  if (!prices) return null
  const multiplier = getCustomerPriceMultiplier(model)
  return Object.fromEntries(
    Object.entries(prices).map(([type, price]) => [type, price * multiplier])
  )
}

export function getPublicCatalogTokenPrices(
  model: PricingModel,
  selectedGroup?: string
): CatalogTokenPrices | null {
  // Connected models must use their billing base before, during and after an
  // account benefit. Announced models retain the reference-price discount.
  if (usesBackendCatalogPricing(model)) {
    return getBackendTokenPrices(model, selectedGroup)
  }
  if (!model.official_price) return null
  const prices: CatalogTokenPrices = {}
  for (const type of CATALOG_PRICE_TYPES) {
    const official = model.official_price[type]
    if (official !== undefined) {
      prices[type] = (official * (100 - OFFICIAL_PRICE_DISCOUNT_PERCENT)) / 100
    }
  }
  return prices
}

export function hasCatalogDiscount(
  model: PricingModel,
  prices: CatalogTokenPrices
): boolean {
  const official = model.official_price
  if (!official) return false
  return CATALOG_PRICE_TYPES.every((type) => {
    const reference = official[type]
    // Every published reference rate must agree with the advertised discount.
    if (reference === undefined) return true
    const actual = prices[type]
    const expected = (reference * (100 - OFFICIAL_PRICE_DISCOUNT_PERCENT)) / 100
    return actual !== undefined && Math.abs(actual - expected) < 1e-9
  })
}
