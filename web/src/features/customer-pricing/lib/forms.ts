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
import { z } from 'zod'

export const modelPriceSchema = z.object({
  model_name: z
    .string()
    .trim()
    .min(1, 'Model name is required')
    .refine((value) => [...value].length <= 128, 'Model name is too long'),
  multiplier: z
    .number()
    .gt(0, 'Enter a multiplier greater than 0 and at most 100')
    .max(100, 'Enter a multiplier greater than 0 and at most 100'),
})
export type ModelPriceForm = z.infer<typeof modelPriceSchema>

export const promotionSchema = z.object({
  name: z
    .string()
    .trim()
    .refine((value) => [...value].length <= 128, 'Name is too long'),
  discount_percent: z
    .number()
    .min(0.01, 'Enter a discount from 0.01% to 99.99%')
    .max(99.99, 'Enter a discount from 0.01% to 99.99%'),
  duration_seconds: z.number().int().min(60).max(31536000),
  redeem_before: z
    .string()
    .refine(
      (value) =>
        !value ||
        (Number.isFinite(Date.parse(value)) &&
          Date.parse(value) > Date.now() &&
          Date.parse(value) <= Date.now() + 365 * 24 * 3600 * 1000),
      'Redemption deadline must be within the next 365 days'
    ),
})
export type PromotionForm = z.infer<typeof promotionSchema>

export function toPromotionPayload(userId: number, values: PromotionForm) {
  return {
    user_id: userId,
    name: values.name,
    multiplier: Number((1 - values.discount_percent / 100).toFixed(8)),
    duration_seconds: values.duration_seconds,
    ...(values.redeem_before
      ? { redeem_before: Math.floor(Date.parse(values.redeem_before) / 1000) }
      : {}),
  }
}

export const redeemPromotionSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Please enter a promotion code')
    .max(256, 'Promotion code is too long'),
})
export type RedeemPromotionForm = z.infer<typeof redeemPromotionSchema>
