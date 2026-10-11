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

interface CTAProps {
  className?: string
  isAuthenticated?: boolean
}

export function CTA(props: CTAProps) {
  const { t } = useTranslation()

  if (props.isAuthenticated) {
    return null
  }

  return (
    <section className='border-border relative isolate overflow-hidden border-t bg-[#fcfdff] px-6 py-16 sm:py-24'>
      <div aria-hidden='true' className='llm-hero-backdrop'>
        <div className='llm-hero-grid' />
        <div className='llm-cta-glow' />
      </div>
      <div className='mx-auto max-w-3xl text-center'>
        <h2 className='text-[clamp(32px,4.4vw,56px)] leading-[1.05] font-semibold tracking-[-0.04em]'>
          {t('Every model deserves')}{' '}
          <br />
          <span className='text-[#4f46e5]'>{t('its own engine.')}</span>
        </h2>
        <p className='mx-auto mt-6 max-w-xl text-base leading-relaxed font-medium text-[#2f3745] sm:text-[17px]'>
          {t(
            'Try any model in the Playground, then point your OpenAI-compatible client at Fluxion with a single API key.'
          )}
        </p>
        <div className='mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center'>
          <Button
            role='link'
            size='lg'
            className='group h-12 gap-2 rounded-full px-6 text-sm'
            render={<Link to='/playground' />}
          >
            {t('Open Playground')}
            <ArrowRight
              aria-hidden='true'
              className='size-4 transition-transform duration-200 group-hover:translate-x-0.5'
            />
          </Button>
          <Button
            role='link'
            size='lg'
            variant='outline'
            className='h-12 rounded-full px-6 text-sm'
            render={<Link to='/docs' />}
          >
            {t('Read the docs')}
          </Button>
        </div>
      </div>
    </section>
  )
}
