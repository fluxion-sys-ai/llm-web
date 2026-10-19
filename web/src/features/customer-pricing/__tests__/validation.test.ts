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
import { expect, test } from 'vitest'

import {
  modelPriceSchema,
  promotionSchema,
  toPromotionPayload,
} from '../lib/forms'

test.each([0, -1, 101, Number.NaN])(
  'invalid model multiplier %s cannot be saved',
  (multiplier) => {
    expect(
      modelPriceSchema.safeParse({ model_name: 'gpt-5', multiplier }).success
    ).toBe(false)
  }
)

test.each([0, 100, -30, 0.000000001, 99.999])(
  'invalid discount percent %s cannot create a promotion',
  (discount_percent) => {
    expect(
      promotionSchema.safeParse({
        name: '',
        discount_percent,
        duration_seconds: 86400,
        redeem_before: '',
      }).success
    ).toBe(false)
  }
)

test('a redemption deadline is serialized as unix seconds without changing the discount duration', () => {
  expect(
    toPromotionPayload(42, {
      name: 'Offer',
      discount_percent: 20,
      duration_seconds: 604800,
      redeem_before: '2027-01-01T00:00:00Z',
    })
  ).toEqual({
    user_id: 42,
    name: 'Offer',
    multiplier: 0.8,
    duration_seconds: 604800,
    redeem_before: 1798761600,
  })
})

test('an optional empty name is valid for a targeted promotion', () => {
  expect(
    promotionSchema.safeParse({
      name: '',
      discount_percent: 30,
      duration_seconds: 86400,
      redeem_before: '',
    }).success
  ).toBe(true)
})

test('a redemption deadline beyond one year is rejected before submission', () => {
  const deadline = new Date(Date.now() + 366 * 24 * 3600 * 1000).toISOString()
  expect(
    promotionSchema.safeParse({
      name: '',
      discount_percent: 30,
      duration_seconds: 86400,
      redeem_before: deadline,
    }).success
  ).toBe(false)
})
