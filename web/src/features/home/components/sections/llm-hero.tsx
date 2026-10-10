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

import { EngineLattice } from '../engine-lattice'

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
      <div className='relative mx-auto flex w-full max-w-[1440px] flex-col items-center px-5 pt-12 pb-10 text-center sm:px-6 sm:pt-16'>
        <h1 className='max-w-[1100px] text-[clamp(34px,4.6vw,48px)] leading-[1.08] font-semibold tracking-[-0.044em] text-balance'>
          {t('Ultra-fast, efficient inference for AI,')}{' '}
          <br className='hidden sm:block' />
          <span className='text-[#777b83]'>{t('built by AI.')}</span>
        </h1>
        <p className='mt-5 max-w-[640px] text-[17px] leading-relaxed font-medium text-balance text-[#2f3745] sm:text-lg'>
          {t('Any model, any chip, lowest cost.')}
        </p>
        <div className='mt-7 flex flex-wrap items-center justify-center gap-2.5'>
          <Button
            role='link'
            size='lg'
            className='h-11 gap-2 px-4 text-xs sm:px-5'
            render={<Link to='/playground' />}
          >
            {t('Open Playground')}
            <ArrowRight aria-hidden='true' className='size-4' />
          </Button>
          <Button
            role='link'
            size='lg'
            variant='outline'
            className='h-11 px-4 text-xs sm:px-5'
            render={<Link to='/pricing' />}
          >
            {t('Models & Pricing')}
          </Button>
        </div>
        <EngineLattice />
      </div>
    </section>
  )
}
