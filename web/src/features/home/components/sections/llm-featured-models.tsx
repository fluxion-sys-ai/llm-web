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
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { ModelCard } from '@/features/pricing/components/model-card'
import { useLlmCatalog } from '@/features/pricing/hooks/use-llm-catalog'
import { featuredModelNames } from '@/features/pricing/lib/catalog'

const featuredOrder = new Map(
  featuredModelNames.map((name, index) => [name.toLowerCase(), index])
)

export function LlmFeaturedModels() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { models, isLoading, error, refetch, priceRate, usdExchangeRate } =
    useLlmCatalog()
  const featuredModels = [...models]
    .sort(
      (a, b) =>
        Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
        (featuredOrder.get(a.model_name.toLowerCase()) ?? featuredOrder.size) -
          (featuredOrder.get(b.model_name.toLowerCase()) ?? featuredOrder.size)
    )
    .slice(0, 3)

  return (
    <section
      id='models'
      aria-labelledby='featured-models-heading'
      className='bg-muted scroll-mt-20'
    >
      <div className='mx-auto w-full max-w-[1440px] px-6 py-16 sm:py-20'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div className='min-w-0'>
            <h2
              id='featured-models-heading'
              className='text-[clamp(26px,3vw,36px)] leading-[1.1] font-semibold tracking-[-0.025em]'
            >
              {t('Featured models')}
            </h2>
            <p className='text-muted-foreground mt-3 max-w-2xl text-base leading-relaxed'>
              {t(
                'Explore capabilities, compare models, and choose the right fit for your application.'
              )}
            </p>
          </div>
          <Button
            role='link'
            variant='ghost'
            className='text-muted-foreground hover:text-foreground shrink-0 self-start sm:self-auto'
            render={<Link to='/pricing' />}
          >
            {t('View all models')}
            <ArrowRight aria-hidden='true' className='size-4' />
          </Button>
        </div>
        <div className='mt-8'>
          {isLoading && <LoadingState />}
          {!isLoading && error && (
            <ErrorState
              title={t('Unable to load models')}
              onRetry={() => void refetch()}
            />
          )}
          {!isLoading && !error && featuredModels.length === 0 && (
            <EmptyState title={t('No models available')} />
          )}
          {!isLoading && !error && featuredModels.length > 0 && (
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {featuredModels.map((model) => (
                <ModelCard
                  key={model.model_name}
                  model={model}
                  priceRate={priceRate}
                  usdExchangeRate={usdExchangeRate}
                  onClick={() => {
                    void navigate({
                      to: '/pricing/$modelId',
                      params: { modelId: model.model_name },
                    })
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
