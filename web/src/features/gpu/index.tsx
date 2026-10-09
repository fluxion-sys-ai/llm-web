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
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Cpu } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { PublicLayout } from '@/components/layout'
import { Footer } from '@/components/layout/components/footer'
import { Button } from '@/components/ui/button'

import { GpuCard } from './components/gpu-card'
import { GpuConfigurationDialog } from './components/gpu-configuration-dialog'
import { GpuFilters } from './components/gpu-filters'
import { gpuCatalog } from './data'

const gpuRoute = getRouteApi('/gpu/')

export function GpuCatalogPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search = gpuRoute.useSearch()
  const [query, setQuery] = useState('')
  const [generation, setGeneration] = useState('all')
  const [memory, setMemory] = useState('all')
  const selectedGpu = gpuCatalog.find((gpu) => gpu.id === search.gpu)
  const hasFilters =
    Boolean(query.trim()) || generation !== 'all' || memory !== 'all'

  const filteredGpus = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLocaleLowerCase()
      .replaceAll(/\s+/g, '')
    return gpuCatalog.filter((gpu) => {
      const searchableName = `${gpu.vendor} ${gpu.name} ${gpu.generation}`
        .toLocaleLowerCase()
        .replaceAll(/\s+/g, '')
      return (
        searchableName.includes(normalizedQuery) &&
        (generation === 'all' || gpu.generation === generation) &&
        (memory === 'all' || gpu.vramGb === Number(memory))
      )
    })
  }, [query, generation, memory])

  const clearFilters = () => {
    setQuery('')
    setGeneration('all')
    setMemory('all')
  }

  const closeConfiguration = () => {
    void navigate({ to: '/gpu', search: {}, replace: true })
  }

  return (
    <PublicLayout showMainContainer={false}>
      <main className='mx-auto w-full max-w-[1440px] px-6 pt-28 pb-16'>
        <header className='mb-10 max-w-3xl'>
          <h1 className='text-4xl leading-[1.1] font-semibold tracking-[-0.025em] sm:text-[40px]'>
            {t('GPU compute')}
          </h1>
          <p className='text-muted-foreground mt-4 text-base leading-relaxed'>
            {t(
              'AI-generated kernels and infrastructure, uniquely designed for each model and GPU combination to deliver the fastest LLM inference.'
            )}
          </p>
          <p className='text-muted-foreground mt-3 text-sm'>
            {t('Pricing and availability will be announced')}
          </p>
        </header>

        <GpuFilters
          query={query}
          generation={generation}
          memory={memory}
          hasFilters={hasFilters}
          onQueryChange={setQuery}
          onGenerationChange={setGeneration}
          onMemoryChange={setMemory}
          onClear={clearFilters}
        />

        <p className='text-muted-foreground my-5 text-sm' aria-live='polite'>
          {t('Showing {{count}} of {{total}} GPUs', {
            count: filteredGpus.length,
            total: gpuCatalog.length,
          })}
        </p>

        {filteredGpus.length > 0 ? (
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {filteredGpus.map((gpu) => (
              <GpuCard
                key={gpu.id}
                gpu={gpu}
                onConfigure={() => {
                  void navigate({ to: '/gpu', search: { gpu: gpu.id } })
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Cpu}
            bordered
            title={t('No GPUs match your filters')}
            description={t('Try a different GPU name or clear the filters.')}
            action={
              <Button onClick={clearFilters}>{t('Clear filters')}</Button>
            }
          />
        )}
      </main>
      <Footer />
      {selectedGpu && (
        <GpuConfigurationDialog
          key={selectedGpu.id}
          gpu={selectedGpu}
          onClose={closeConfiguration}
        />
      )}
    </PublicLayout>
  )
}
