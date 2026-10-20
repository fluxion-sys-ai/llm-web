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
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useCustomerBenefits } from '@/features/customer-pricing/hooks/use-customer-benefits'
import { useStatus } from '@/hooks/use-status'
import { useAuthStore } from '@/stores/auth-store'

import { getPricing } from '../api'
import { resolveCustomerPrice } from '../lib/customer-price'

export function usePricingData(enabled = true, personalized = false) {
  const { status } = useStatus()
  const userId = useAuthStore((state) => state.auth.user?.id)
  const benefits = useCustomerBenefits(enabled && personalized)

  const {
    data: publicData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: userId === undefined ? ['pricing'] : ['pricing', userId],
    queryFn: getPricing,
    staleTime: 5 * 60 * 1000,
    enabled,
  })

  const data = useMemo(() => {
    if (!publicData || !Array.isArray(publicData.data)) return publicData
    return {
      ...publicData,
      data: publicData.data.map((model) => ({
        ...model,
        customer_price:
          personalized && benefits.data && !benefits.isError
            ? resolveCustomerPrice(
                model.model_name,
                benefits.data,
                benefits.now
              )
            : undefined,
      })),
    }
  }, [publicData, personalized, benefits.data, benefits.isError, benefits.now])

  // Ensure rates never reach zero to prevent division errors
  const priceRate = useMemo(
    () => Math.max((status?.price as number) ?? 1, 0.001),
    [status?.price]
  )
  const usdExchangeRate = useMemo(
    () => Math.max((status?.usd_exchange_rate as number) ?? priceRate, 0.001),
    [status?.usd_exchange_rate, priceRate]
  )

  const models = useMemo(() => {
    if (!Array.isArray(data?.data)) return []

    const vendorMap = new Map(
      (data.vendors ?? []).map((vendor) => [vendor.id, vendor])
    )
    return data.data.map((model) => {
      const vendor = model.vendor_id
        ? vendorMap.get(model.vendor_id)
        : undefined
      return {
        ...model,
        key: model.model_name,
        vendor_name: model.vendor_name || vendor?.name,
        vendor_icon: model.vendor_icon || vendor?.icon,
        vendor_description: model.vendor_description || vendor?.description,
        group_ratio: data.group_ratio,
      }
    })
  }, [data])

  return {
    data,
    models,
    vendors: data?.vendors ?? [],
    groupRatio: data?.group_ratio ?? {},
    usableGroup: data?.usable_group ?? {},
    endpointMap: data?.supported_endpoint ?? {},
    autoGroups: data?.auto_groups ?? [],
    isLoading,
    error,
    refetch,
    priceRate,
    usdExchangeRate,
  }
}
