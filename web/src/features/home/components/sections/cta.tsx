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
    <section className='border-border bg-muted relative border-t px-6 py-16 sm:py-20'>
      <div className='mx-auto max-w-2xl text-center'>
        <h2 className='text-[clamp(28px,4vw,44px)] leading-[1.1] font-semibold tracking-[-0.03em]'>
          {t('Ready to simplify')}
          <br />
          <span>{t('your AI integration?')}</span>
        </h2>
        <p className='text-muted-foreground mx-auto mt-5 max-w-md text-sm leading-relaxed md:text-base'>
          {t(
            'Start with a conversation in the Playground, then use an API key to bring a model into your application.'
          )}
        </p>
        <div className='mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center'>
          <Button
            role='link'
            className='group h-11 gap-2 px-5 text-[15px]'
            render={<Link to='/playground' />}
          >
            {t('Open Playground')}
            <ArrowRight
              aria-hidden='true'
              className='ml-1 size-3.5 transition-transform duration-200 group-hover:translate-x-0.5'
            />
          </Button>
          <Button
            role='link'
            variant='outline'
            className='h-11 px-5 text-[15px]'
            render={<Link to='/docs' />}
          >
            {t('Read the docs')}
          </Button>
        </div>
      </div>
    </section>
  )
}
