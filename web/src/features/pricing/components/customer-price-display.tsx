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
import { Tag, TicketPercent } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { discountPercent } from '@/features/customer-pricing/lib/promotion-status'
import { formatTimestamp } from '@/features/subscriptions/lib'
import { cn } from '@/lib/utils'

import { hasCustomerPrice } from '../lib/customer-price'
import type { PricingModel } from '../types'

export function CustomerPricePanel(props: {
  model: PricingModel
  children: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  if (!hasCustomerPrice(props.model)) return props.children
  return (
    <div
      className={cn(
        'min-w-0 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800 dark:bg-emerald-950/30',
        props.className
      )}
    >
      <div className='flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-200'>
        <Tag aria-hidden className='size-3.5 shrink-0' />
        {t('Your price')}
      </div>
      {props.children}
    </div>
  )
}

export function CustomerPriceBadges(props: { model: PricingModel }) {
  const { t } = useTranslation()
  if (!hasCustomerPrice(props.model)) return null
  const price = props.model.customer_price
  return (
    <>
      {price.modelMultiplier !== 1 && (
        <Badge variant='secondary' className='max-w-full whitespace-normal'>
          {t('Custom rate: {{multiplier}}×', {
            multiplier: price.modelMultiplier,
          })}
        </Badge>
      )}
      {price.promotionMultiplier < 1 && (
        <Badge
          variant='secondary'
          className='max-w-full gap-1 bg-emerald-100 whitespace-normal text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100'
          title={price.promotionName}
        >
          <TicketPercent aria-hidden className='size-3 shrink-0' />
          {t('Extra {{percent}}% off', {
            percent: discountPercent(price.promotionMultiplier),
          })}
        </Badge>
      )}
      {price.promotionExpiresAt !== undefined && (
        <span className='text-muted-foreground basis-full text-xs font-normal break-words'>
          {t('Expires: {{date}}', {
            date: formatTimestamp(price.promotionExpiresAt),
          })}
        </span>
      )}
    </>
  )
}
