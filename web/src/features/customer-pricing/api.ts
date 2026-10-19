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
import { isAxiosError } from 'axios'

import { api } from '@/lib/api'

import type {
  CreatePromotion,
  CustomerBenefits,
  CustomerPricing,
  ModelPrice,
  PricingModel,
  Promotion,
  PromotionPage,
} from './types'

interface Response<T> {
  success: boolean
  data: T
  message?: string
}

async function customerPricingResult<T>(
  request: Promise<{ data: Response<T> }>
): Promise<T> {
  try {
    const response = (await request).data
    if (!response.success) throw new Error(response.message || 'Request failed')
    return response.data
  } catch (error) {
    if (
      isAxiosError<{ message?: unknown }>(error) &&
      typeof error.response?.data?.message === 'string'
    ) {
      // The API uses non-2xx statuses for invalid, unavailable, and expired codes.
      // Retain its reason for translated inline feedback without retaining request data.
      throw new Error(error.response.data.message)
    }
    throw error
  }
}

export async function getCustomerPricing(
  userId: number
): Promise<CustomerPricing> {
  return customerPricingResult(
    api.get<Response<CustomerPricing>>(`/api/customer-pricing/users/${userId}`)
  )
}

export async function saveModelPrice(
  userId: number,
  price: ModelPrice
): Promise<CustomerPricing> {
  return customerPricingResult(
    api.put<Response<CustomerPricing>>(
      `/api/customer-pricing/users/${userId}/models`,
      price
    )
  )
}

export async function deleteModelPrice(
  userId: number,
  modelName: string
): Promise<CustomerPricing> {
  return customerPricingResult(
    api.delete<Response<CustomerPricing>>(
      `/api/customer-pricing/users/${userId}/models`,
      { params: { model_name: modelName } }
    )
  )
}

export async function setPromotionEnabled(
  userId: number,
  enabled: boolean
): Promise<CustomerPricing> {
  return customerPricingResult(
    api.patch<Response<CustomerPricing>>(
      `/api/customer-pricing/users/${userId}/promotion`,
      { enabled }
    )
  )
}

export async function getPromotionCodes(
  userId: number | undefined,
  page: number
): Promise<PromotionPage> {
  return customerPricingResult(
    api.get<Response<PromotionPage>>('/api/customer-pricing/codes', {
      params: {
        ...(userId ? { user_id: userId } : {}),
        p: page,
        page_size: 10,
      },
    })
  )
}

export async function createPromotionCode(
  payload: CreatePromotion
): Promise<{ code: string; promotion: Promotion }> {
  return customerPricingResult(
    api.post<Response<{ code: string; promotion: Promotion }>>(
      '/api/customer-pricing/codes',
      payload
    )
  )
}

export async function stopPromotion(
  id: number,
  action: 'disable' | 'revoke'
): Promise<Promotion> {
  return customerPricingResult(
    api.post<Response<Promotion>>(`/api/customer-pricing/codes/${id}/${action}`)
  )
}

export async function getSelfBenefits(): Promise<CustomerBenefits> {
  return customerPricingResult(
    api.get<Response<CustomerBenefits>>('/api/user/self/promotions')
  )
}

export async function redeemPromotion(code: string): Promise<Promotion> {
  return customerPricingResult(
    api.post<Response<Promotion>>('/api/user/self/promotions/redeem', {
      code: code.trim(),
    })
  )
}

export async function getPricingModels(): Promise<PricingModel[]> {
  return customerPricingResult(
    api.get<Response<PricingModel[]>>('/api/customer-pricing/models')
  )
}
