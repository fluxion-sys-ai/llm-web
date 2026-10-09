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
import { Trans, useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import { EngineAnimation } from '../engine-animation'

export function LlmHero() {
  const { t } = useTranslation()

  return (
    <section className='border-border relative isolate overflow-hidden border-b bg-[#fcfdff] pt-14'>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_59%_73%,#d6e6fc_0%,#edf4ff_35%,transparent_68%)] opacity-65'
      />
      <div className='relative mx-auto flex w-full max-w-[1440px] flex-col items-center px-5 pt-12 pb-8 text-center sm:px-6 sm:pt-16'>
        <h1 className='max-w-[1100px] text-[clamp(34px,4.6vw,48px)] leading-[1.08] font-semibold tracking-[-0.044em] text-balance'>
          {t('Leading language models.')}
          <br />
          <span className='text-[#777b83]'>{t('One API.')}</span>
        </h1>
        <p className='mt-6 max-w-[610px] text-sm leading-relaxed text-balance text-[#626773] sm:text-base'>
          <Trans
            t={t}
            i18nKey='A <strong>specialized inference engine</strong> for every model–GPU pair.'
            components={{
              strong: <strong className='font-medium text-[#252c38]' />,
            }}
          />
        </p>
        <div className='mt-6 flex flex-wrap items-center justify-center gap-2.5'>
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
        <EngineAnimation />
      </div>
    </section>
  )
}
