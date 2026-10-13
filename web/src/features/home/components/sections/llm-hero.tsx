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

import { Button } from '@/components/ui/button'

import '@/styles/llm-hero.css'

import { EngineIllustration } from '../engine-illustration'

export function LlmHero() {
  const { t } = useTranslation()

  return (
    <section className='border-border relative isolate overflow-hidden border-b bg-[#fcfdff] pt-14'>
      <div aria-hidden='true' className='llm-hero-backdrop'>
        <div className='llm-hero-grid' />
        <div className='llm-hero-glow' />
        <div className='llm-hero-streaks'>
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className='relative mx-auto w-full max-w-[1440px] px-5 pt-10 pb-10 sm:px-6 sm:pt-14 lg:pt-12'>
        <div className='grid items-center gap-10 lg:grid-cols-2 lg:gap-8'>
          <div className='min-w-0'>
            <h1 className='text-[clamp(40px,5vw,72px)] leading-[1.02] font-semibold tracking-[-0.045em]'>
              {t('Ultra-fast, efficient')} <br />
              {t('inference for AI,')} <br />
              <span className='text-[#4f46e5]'>{t('built by AI.')}</span>
            </h1>
            <p className='mt-6 max-w-[520px] text-[17px] leading-relaxed font-medium text-[#2f3745] sm:text-lg'>
              {t('Any model, any chip, lowest cost.')}
            </p>
            <div className='mt-8 flex flex-wrap items-center gap-3'>
              <Button
                role='link'
                size='lg'
                className='h-12 gap-2 rounded-full px-6 text-sm'
                render={<Link to='/playground' />}
              >
                {t('Open Playground')}
                <ArrowRight aria-hidden='true' className='size-4' />
              </Button>
              <Button
                role='link'
                size='lg'
                variant='outline'
                className='h-12 rounded-full px-6 text-sm'
                render={<Link to='/pricing' />}
              >
                {t('Models & Pricing')}
              </Button>
            </div>
          </div>
          <EngineIllustration className='mx-auto w-full max-w-[760px] lg:max-w-none' />
        </div>
      </div>
    </section>
  )
}
