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
import { ArrowRight, KeyRound, MessageSquare, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'

export function Features() {
  const { t } = useTranslation()
  const features = [
    {
      id: 'models',
      title: t('Models & Pricing'),
      description: t(
        'Browse available models and review their pricing before you start.'
      ),
      icon: Layers,
      to: '/pricing',
      action: t('Explore Models'),
    },
    {
      id: 'playground',
      title: t('Playground'),
      description: t(
        'Try prompts, adjust model settings, and continue a conversation in your browser.'
      ),
      icon: MessageSquare,
      to: '/playground',
      action: t('Open Playground'),
    },
    {
      id: 'keys',
      title: t('API Keys'),
      description: t(
        'Create and manage API keys to connect your own applications.'
      ),
      icon: KeyRound,
      to: '/keys',
      action: t('Get API Key'),
    },
  ] as const

  return (
    <section className='relative z-10 px-6 py-12 md:py-16'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-8 max-w-2xl'>
          <h2 className='text-2xl font-semibold tracking-tight md:text-3xl'>
            {t('From your first prompt to your application')}
          </h2>
        </AnimateInView>
        <div className='border-border bg-border grid gap-px overflow-hidden rounded-xl border md:grid-cols-3'>
          {features.map((feature, index) => (
            <AnimateInView
              key={feature.id}
              delay={index * 100}
              animation='fade-up'
              className='bg-background flex flex-col items-start p-7 md:p-8'
            >
              <feature.icon
                aria-hidden='true'
                className='text-brand mb-4 size-5'
              />
              <h3 className='mb-3 text-base font-semibold'>{feature.title}</h3>
              <p className='text-muted-foreground mb-6 flex-1 text-sm leading-relaxed'>
                {feature.description}
              </p>
              <Button
                role='link'
                variant='outline'
                render={<Link to={feature.to} />}
              >
                {feature.action}
                <ArrowRight aria-hidden='true' className='size-4' />
              </Button>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
