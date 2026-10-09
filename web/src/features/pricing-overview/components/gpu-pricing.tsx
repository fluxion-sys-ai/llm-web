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
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SiNvidia } from 'react-icons/si'

import { StaticDataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { gpuCatalog } from '@/features/gpu/data'

export function GpuPricing() {
  const { t } = useTranslation()

  return (
    <section className='space-y-6' aria-label={t('GPU compute')}>
      <div>
        <h2 className='text-2xl font-semibold tracking-tight'>
          {t('GPU compute')}
        </h2>
        <p className='text-muted-foreground mt-2 text-sm leading-relaxed'>
          {t('Pricing and availability will be announced')}
        </p>
      </div>
      <StaticDataTable
        data={gpuCatalog}
        getRowKey={(gpu) => gpu.id}
        className='border-border rounded-xl'
        tableClassName='min-w-[680px]'
        tableProps={{ 'aria-label': t('GPU compute') }}
        headerRowClassName='bg-muted/50 hover:bg-muted/50'
        columns={[
          {
            id: 'gpu',
            header: t('GPU'),
            className: 'px-5',
            cellClassName: 'px-5 py-5',
            cell: (gpu) => (
              <div className='flex items-center gap-3'>
                <SiNvidia
                  aria-hidden='true'
                  className='size-6 shrink-0 text-[#76b900]'
                />
                <span className='font-medium'>{gpu.name}</span>
              </div>
            ),
          },
          {
            id: 'memory',
            header: t('VRAM'),
            className: 'px-5',
            cellClassName: 'px-5 py-5 font-mono',
            cell: (gpu) => t('{{value}} GB', { value: gpu.vramGb }),
          },
          {
            id: 'price',
            header: t('Hourly price'),
            className: 'px-5',
            cellClassName: 'px-5 py-5',
            cell: () => (
              <span>
                <span className='block font-medium'>
                  {t('To be configured')}
                </span>
                <span className='text-muted-foreground mt-1 block text-xs'>
                  {t('Per GPU / hour')}
                </span>
              </span>
            ),
          },
          {
            id: 'configuration',
            header: <span className='sr-only'>{t('View configuration')}</span>,
            className: 'px-5 text-right',
            cellClassName: 'px-5 py-5 text-right',
            cell: (gpu) => (
              <Button
                role='link'
                variant='outline'
                size='sm'
                aria-label={t('View configuration for {{gpu}}', {
                  gpu: gpu.name,
                })}
                render={<Link to='/gpu' search={{ gpu: gpu.id }} />}
              >
                {t('View configuration')}
                <ArrowRight aria-hidden='true' className='size-4' />
              </Button>
            ),
          },
        ]}
      />
    </section>
  )
}
