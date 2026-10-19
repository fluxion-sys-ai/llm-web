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

import { formatTimestamp } from '@/features/subscriptions/lib'
import { formatLogQuota } from '@/lib/format'

import type { CustomerPricingLog } from '../types'
import { DetailRow, DetailSection } from './dialogs/log-detail-layout'

export function CustomerPricingDetails(props: { pricing: CustomerPricingLog }) {
  const { t } = useTranslation()
  const pricing = props.pricing
  const rows = [
    { label: t('Model multiplier'), value: pricing.model_multiplier },
    { label: t('Promotion multiplier'), value: pricing.promotion_multiplier },
    { label: t('Final multiplier'), value: pricing.multiplier },
  ].filter((row) => typeof row.value === 'number' && Number.isFinite(row.value))
  const fees: Array<{ label: string; value: string }> = []
  if (
    typeof pricing.base_quota === 'number' &&
    Number.isFinite(pricing.base_quota) &&
    typeof pricing.charged_quota === 'number' &&
    Number.isFinite(pricing.charged_quota)
  ) {
    fees.push(
      { label: t('Original Cost'), value: formatLogQuota(pricing.base_quota) },
      { label: t('Charged Cost'), value: formatLogQuota(pricing.charged_quota) }
    )
  }
  return (
    <DetailSection label={t('Customer pricing')}>
      {rows.map((row) => (
        <DetailRow
          key={row.label}
          label={row.label}
          value={`${row.value}×`}
          mono
        />
      ))}
      {fees.map((row) => (
        <DetailRow key={row.label} label={row.label} value={row.value} mono />
      ))}
      {typeof pricing.promotion_expires_at === 'number' &&
        pricing.promotion_expires_at > 0 && (
          <DetailRow
            label={t('Promotion expires')}
            value={formatTimestamp(pricing.promotion_expires_at)}
            mono
          />
        )}
    </DetailSection>
  )
}
