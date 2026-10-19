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
export interface ModelPrice {
  model_name: string
  multiplier: number
}

export interface CustomerPricing {
  user_id: number
  promotion_codes_enabled: boolean
  model_prices: ModelPrice[]
}

export type PromotionStatus =
  | 'available'
  | 'disabled'
  | 'active'
  | 'expired'
  | 'revoked'

export interface Promotion {
  id: number
  user_id: number
  name: string
  multiplier: number
  duration_seconds: number
  redeem_before: number
  starts_at: number
  expires_at: number
  created_at: number
  code_mask: string
  status: PromotionStatus
}

export interface CustomerBenefits extends CustomerPricing {
  promotions: Promotion[]
}

export interface PromotionPage {
  items: Promotion[]
  total: number
  page: number
  page_size: number
}

export interface CreatePromotion {
  user_id: number
  name: string
  multiplier: number
  duration_seconds: number
  redeem_before?: number
}
