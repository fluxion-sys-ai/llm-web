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
import type { Promotion, PromotionStatus } from '../types'

export function getPromotionStatus(
  promotion: Promotion,
  now: number
): PromotionStatus {
  if (promotion.status === 'revoked' || promotion.status === 'disabled') {
    return promotion.status
  }
  if (promotion.starts_at > 0 && promotion.expires_at <= now) return 'expired'
  if (
    !promotion.starts_at &&
    promotion.redeem_before > 0 &&
    promotion.redeem_before <= now
  ) {
    return 'expired'
  }
  return promotion.status
}

export function discountPercent(multiplier: number): string {
  return Number(((1 - multiplier) * 100).toFixed(4)).toString()
}
