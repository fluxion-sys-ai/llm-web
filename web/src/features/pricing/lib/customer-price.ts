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
import { getPromotionStatus } from '@/features/customer-pricing/lib/promotion-status'
import type {
  CustomerBenefits,
  Promotion,
} from '@/features/customer-pricing/types'

import type { CustomerPriceAdjustment, PricingModel } from '../types'

/** Match the server's exact model IDs; display names/casing are not billing aliases. */
export function resolveCustomerPrice(
  modelName: string,
  benefits: CustomerBenefits,
  now: number
): CustomerPriceAdjustment {
  const custom = benefits.model_prices.find(
    (price) => price.model_name === modelName.trim()
  )?.multiplier
  const modelMultiplier =
    custom !== undefined && Number.isFinite(custom) && custom > 0 ? custom : 1
  let promotion: Promotion | undefined
  if (benefits.promotion_codes_enabled) {
    for (const candidate of benefits.promotions) {
      if (
        getPromotionStatus(candidate, now) !== 'active' ||
        Boolean(candidate.disabled_at) ||
        Boolean(candidate.revoked_at) ||
        candidate.starts_at <= 0 ||
        candidate.starts_at > now ||
        candidate.expires_at <= now ||
        !Number.isFinite(candidate.multiplier) ||
        candidate.multiplier <= 0 ||
        candidate.multiplier >= 1
      ) {
        continue
      }
      if (
        !promotion ||
        candidate.multiplier < promotion.multiplier ||
        (candidate.multiplier === promotion.multiplier &&
          candidate.id < promotion.id)
      ) {
        promotion = candidate
      }
    }
  }
  const promotionMultiplier = promotion?.multiplier ?? 1
  return {
    modelMultiplier,
    promotionMultiplier,
    multiplier: modelMultiplier * promotionMultiplier,
    promotionExpiresAt: promotion?.expires_at,
    promotionName: promotion?.name,
  }
}

export function hasCustomerPrice(
  model: PricingModel
): model is PricingModel & { customer_price: CustomerPriceAdjustment } {
  return (
    model.availability !== 'coming_soon' &&
    model.pricing_status !== 'pending' &&
    Boolean(
      model.customer_price &&
      (model.customer_price.modelMultiplier !== 1 ||
        model.customer_price.promotionMultiplier !== 1)
    )
  )
}

export function getCustomerPriceMultiplier(model: PricingModel): number {
  return hasCustomerPrice(model) ? model.customer_price.multiplier : 1
}
