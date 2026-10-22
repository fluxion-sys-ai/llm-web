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

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { llmUsageBucketFields, type LLMUsageRules } from '../lib/usage-policy'

export type UsageSummaryData = {
  policy: LLMUsageRules
  balance: number[]
  active: number
  unresolved: number
  estimated?: number
  decision: { allowed: boolean; dimension: number; retry_after_ms: number }
  key?: Omit<UsageSummaryData, 'key' | 'unresolved'>
}

export function UsageSummary(props: { data: UsageSummaryData }) {
  const { t } = useTranslation()
  return (
    <section aria-label={t('Account usage limits')} className='space-y-3'>
      <h3 className='font-medium'>{t('Account usage limits')}</h3>
      <p>
        {t('Active operations')}: {props.data.active} /{' '}
        {props.data.policy.enabled
          ? props.data.policy.max_concurrent
          : t('Unlimited')}
      </p>
      {props.data.unresolved > 0 && (
        <p role='status'>{t('Usage is awaiting reconciliation.')}</p>
      )}
      {(props.data.estimated ?? 0) > 0 && (
        <p role='status'>
          {t(
            'Some usage is estimated. Limits will be adjusted when final usage arrives.'
          )}
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Usage')}</TableHead>
            <TableHead>{t('Burst capacity')}</TableHead>
            <TableHead>{t('Remaining')}</TableHead>
            <TableHead>{t('Refill per period')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {llmUsageBucketFields.map((b, i) => {
            const enabled =
              props.data.policy.enabled &&
              props.data.policy[b.name].capacity > 0
            return (
              <TableRow key={b.name}>
                <TableCell>{t(b.label)}</TableCell>
                <TableCell>
                  {enabled
                    ? props.data.policy[b.name].capacity
                    : t('Unlimited')}
                </TableCell>
                <TableCell>
                  {enabled
                    ? props.data.balance[i] /
                      (b.name === 'cost_usd' ? 1000000 : 1)
                    : '—'}
                </TableCell>
                <TableCell>
                  {enabled ? props.data.policy[b.name].refill : '—'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <p className='text-muted-foreground text-sm'>
        {t('Refill period (seconds)')}:{' '}
        {props.data.policy.refill_period_seconds}
      </p>
    </section>
  )
}
