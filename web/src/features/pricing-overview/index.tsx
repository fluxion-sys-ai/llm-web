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
import { Cpu, MessagesSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { Footer } from '@/components/layout/components/footer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { GpuPricing } from './components/gpu-pricing'
import { LlmPricing } from './components/llm-pricing'

export function PricingOverviewPage() {
  const { t } = useTranslation()

  return (
    <PublicLayout showMainContainer={false}>
      <main className='mx-auto w-full max-w-[1440px] px-6 pt-28 pb-16'>
        <header className='mb-10 max-w-3xl'>
          <h1 className='text-4xl leading-[1.1] font-semibold tracking-[-0.025em] sm:text-[40px]'>
            {t('Pricing')}
          </h1>
          <p className='text-muted-foreground mt-4 text-base leading-relaxed'>
            {t('Compare pricing for LLM APIs and GPU compute.')}
          </p>
        </header>

        <Tabs defaultValue='llm' className='gap-8'>
          <TabsList aria-label={t('Pricing categories')}>
            <TabsTrigger value='llm' className='gap-2 px-4'>
              <MessagesSquare aria-hidden='true' className='size-4' />
              {t('LLM API')}
            </TabsTrigger>
            <TabsTrigger value='gpu' className='gap-2 px-4'>
              <Cpu aria-hidden='true' className='size-4' />
              {t('GPU compute')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value='llm'>
            <LlmPricing />
          </TabsContent>
          <TabsContent value='gpu'>
            <GpuPricing />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </PublicLayout>
  )
}
