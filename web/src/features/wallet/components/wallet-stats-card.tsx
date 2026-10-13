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
import { Activity, BarChart3, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { IconBadge, type IconBadgeTone } from '@/components/ui/icon-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatQuota } from '@/lib/format'

import type { UserWalletData } from '../types'

interface WalletStatsCardProps {
  user: UserWalletData | null
  loading?: boolean
}

export function WalletStatsCard(props: WalletStatsCardProps) {
  const { t } = useTranslation()
  if (props.loading) {
    return (
      <div className='bg-card grid grid-cols-3 divide-x overflow-hidden rounded-xl border'>
        {['balance', 'usage', 'requests'].map((key) => (
          <div key={key} className='min-w-0 px-3 py-5 sm:px-6 sm:py-6'>
            <Skeleton className='h-3.5 w-full' />
            <Skeleton className='mt-4 h-7 w-full sm:h-9' />
            <Skeleton className='mt-1.5 hidden h-3.5 w-24 md:block' />
          </div>
        ))}
      </div>
    )
  }

  const stats: {
    label: string
    value: string
    description: string
    icon: typeof WalletCards
    tone: IconBadgeTone
  }[] = [
    {
      label: t('Current Balance'),
      value: formatQuota(props.user?.quota ?? 0),
      description: t('Remaining quota'),
      icon: WalletCards,
      tone: 'neutral',
    },
    {
      label: t('Total Usage'),
      value: formatQuota(props.user?.used_quota ?? 0),
      description: t('Total consumed quota'),
      icon: BarChart3,
      tone: 'neutral',
    },
    {
      label: t('API Requests'),
      value: (props.user?.request_count ?? 0).toLocaleString(),
      description: t('Total requests made'),
      icon: Activity,
      tone: 'neutral',
    },
  ]

  return (
    <div className='bg-card grid grid-cols-3 divide-x overflow-hidden rounded-xl border'>
      {stats.map((item) => (
        <div key={item.label} className='min-w-0 px-3 py-5 sm:px-6 sm:py-6'>
          <div className='flex min-h-14 flex-col items-start gap-2 sm:min-h-7 sm:flex-row sm:items-center sm:gap-2.5'>
            <IconBadge tone={item.tone} size='stat'>
              <item.icon />
            </IconBadge>
            <div className='text-muted-foreground text-[11px] leading-snug font-medium sm:text-xs'>
              {item.label}
            </div>
          </div>

          <div className='text-foreground mt-3 font-sans text-xl leading-tight font-semibold tracking-[-0.025em] break-all tabular-nums sm:text-3xl'>
            {item.value}
          </div>
          <div className='text-muted-foreground mt-2 hidden text-xs leading-relaxed md:block'>
            {item.description}
          </div>
        </div>
      ))}
    </div>
  )
}
