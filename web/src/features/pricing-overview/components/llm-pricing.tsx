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

import { StaticDataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { ModelBillingModeBadge } from '@/features/pricing/components/model-billing-mode-badge'
import { ModelPriceCell } from '@/features/pricing/components/model-price-cell'
import { useLlmCatalog } from '@/features/pricing/hooks/use-llm-catalog'
import { getLobeIcon } from '@/lib/lobe-icon'

export function LlmPricing() {
  const { t } = useTranslation()
  const { models, isLoading, error, refetch, priceRate, usdExchangeRate } =
    useLlmCatalog()

  return (
    <section className='space-y-6' aria-label={t('LLM API')}>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold tracking-tight'>
            {t('LLM API')}
          </h2>
          <p className='text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed'>
            {t(
              'Token prices are shown per 1M tokens. Other billing modes use their configured units.'
            )}
          </p>
        </div>
        <Button
          role='link'
          variant='outline'
          className='shrink-0 self-start'
          render={<Link to='/pricing' />}
        >
          {t('All Models')}
          <ArrowRight aria-hidden='true' className='size-4' />
        </Button>
      </div>

      {isLoading && <LoadingState />}
      {!isLoading && error && (
        <ErrorState
          title={t('Unable to load models')}
          onRetry={() => void refetch()}
        />
      )}
      {!isLoading && !error && models.length === 0 && (
        <EmptyState title={t('No models available')} bordered />
      )}
      {!isLoading && !error && models.length > 0 && (
        <StaticDataTable
          data={models}
          getRowKey={(model) => model.model_name}
          className='border-border rounded-xl'
          tableClassName='min-w-[720px] table-fixed'
          tableProps={{ 'aria-label': t('LLM API') }}
          headerRowClassName='bg-muted/50 hover:bg-muted/50'
          columns={[
            {
              id: 'model',
              header: t('Model'),
              className: 'w-[38%] px-5',
              cellClassName: 'px-5 py-5 whitespace-normal',
              cell: (model) => (
                <Link
                  to='/pricing/$modelId'
                  params={{ modelId: model.model_name }}
                  className='hover:text-brand focus-visible:ring-ring/50 flex min-w-0 items-center gap-3 rounded-sm outline-none focus-visible:ring-2'
                >
                  <span
                    aria-hidden='true'
                    className='flex size-8 shrink-0 items-center justify-center'
                  >
                    {getLobeIcon(model.icon || model.vendor_icon, 24)}
                  </span>
                  <span className='min-w-0'>
                    <span className='flex flex-wrap items-center gap-2'>
                      <span className='font-medium break-words'>
                        {model.display_name || model.model_name}
                      </span>
                    </span>
                    {model.display_name &&
                      model.display_name !== model.model_name && (
                        <code className='text-muted-foreground mt-1 block text-xs break-all'>
                          {model.model_name}
                        </code>
                      )}
                  </span>
                </Link>
              ),
            },
            {
              id: 'billing-mode',
              header: t('Billing mode'),
              className: 'w-[22%] px-5',
              cellClassName: 'px-5 py-5 whitespace-normal',
              cell: (model) =>
                model.availability === 'coming_soon' ? (
                  <span className='text-muted-foreground text-sm'>—</span>
                ) : (
                  <ModelBillingModeBadge model={model} />
                ),
            },
            {
              id: 'price',
              header: t('Price'),
              className: 'w-[40%] px-5',
              cellClassName: 'px-5 py-5 whitespace-normal',
              cell: (model) => (
                <ModelPriceCell
                  model={model}
                  options={{ tokenUnit: 'M', priceRate, usdExchangeRate }}
                />
              ),
            },
          ]}
        />
      )}
    </section>
  )
}
