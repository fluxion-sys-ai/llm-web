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
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { formatTimestamp } from '@/features/subscriptions/lib'

import { discountPercent, getPromotionStatus } from '../lib/promotion-status'
import type { Promotion, PromotionStatus } from '../types'

const statusLabels: Record<PromotionStatus, string> = {
  available: 'Unredeemed',
  disabled: 'Disabled',
  active: 'Active',
  expired: 'Expired',
  revoked: 'Revoked',
}

export function PromotionDetails(props: {
  promotion: Promotion
  now: number
  enabled: boolean
}) {
  const { t } = useTranslation()
  const promotion = props.promotion
  const status = getPromotionStatus(promotion, props.now)
  const blocked = status === 'active' && !props.enabled
  const statusLabel =
    promotion.audience === 'all_users' &&
    !promotion.starts_at &&
    status === 'available'
      ? 'Available'
      : statusLabels[status]
  return (
    <div className='min-w-0 space-y-1.5'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='font-medium break-words'>
          {promotion.name || t('Promotion code')}
        </span>
        <Badge
          variant={status === 'active' && !blocked ? 'default' : 'secondary'}
        >
          {blocked ? t('Discounts paused') : t(statusLabel)}
        </Badge>
      </div>
      <p className='text-sm'>
        {t('{{percent}}% off all models', {
          percent: discountPercent(promotion.multiplier),
        })}
      </p>
      <p className='text-muted-foreground text-xs'>
        {promotion.starts_at > 0
          ? t('Expires: {{date}}', {
              date: formatTimestamp(promotion.expires_at),
            })
          : t('Duration after redemption: {{hours}} hours', {
              hours: promotion.duration_seconds / 3600,
            })}
      </p>
      {!promotion.starts_at && promotion.redeem_before > 0 && (
        <p className='text-muted-foreground text-xs'>
          {t('Redeem before: {{date}}', {
            date: formatTimestamp(promotion.redeem_before),
          })}
        </p>
      )}
    </div>
  )
}
