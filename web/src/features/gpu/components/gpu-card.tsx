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
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SiNvidia } from 'react-icons/si'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import type { GpuSpec } from '../data'

type GpuCardProps = {
  gpu: GpuSpec
  onConfigure: () => void
}

export function GpuCard(props: GpuCardProps) {
  const { t } = useTranslation()
  const titleId = `gpu-card-${props.gpu.id}`

  return (
    <Card
      role='article'
      aria-labelledby={titleId}
      className='hover:border-foreground/20 h-full gap-5 rounded-xl transition-colors'
    >
      <CardHeader className='flex flex-row items-start justify-between gap-4'>
        <div className='flex min-w-0 items-center gap-3'>
          <SiNvidia
            aria-hidden='true'
            className='size-9 shrink-0 text-[#76b900]'
          />
          <div className='min-w-0'>
            <p className='text-muted-foreground mb-1 text-xs'>
              {props.gpu.vendor}
            </p>
            <h2
              id={titleId}
              className='text-lg leading-snug font-semibold tracking-tight'
            >
              {props.gpu.name}
            </h2>
          </div>
        </div>
        <Badge
          variant='outline'
          className='text-muted-foreground shrink-0 font-normal'
        >
          {props.gpu.generation}
        </Badge>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col gap-5'>
        <p className='text-muted-foreground min-h-10 text-sm leading-relaxed'>
          {t(props.gpu.description)}
        </p>
        <div className='mt-auto'>
          <p className='text-muted-foreground text-xs'>{t('Hourly price')}</p>
          <p className='mt-1 text-lg font-medium'>{t('To be configured')}</p>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('Per GPU / hour')}
          </p>
        </div>
        <Separator />
        <dl className='grid grid-cols-3 gap-3 text-sm'>
          <div>
            <dt className='text-muted-foreground text-xs'>{t('VRAM')}</dt>
            <dd className='mt-1.5 font-mono font-medium tabular-nums'>
              {t('{{value}} GB', { value: props.gpu.vramGb })}
            </dd>
          </div>
          <div>
            <dt className='text-muted-foreground text-xs'>{t('RAM')}</dt>
            <dd className='mt-1.5 break-words'>{t('Configurable')}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground text-xs'>{t('vCPU')}</dt>
            <dd className='mt-1.5 break-words'>{t('Configurable')}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className='border-0 bg-transparent pt-0'>
        <Button
          className='w-full'
          onClick={props.onConfigure}
          aria-label={t('View configuration for {{gpu}}', {
            gpu: props.gpu.name,
          })}
        >
          {t('View configuration')}
          <ArrowRight aria-hidden='true' className='size-4' />
        </Button>
      </CardFooter>
    </Card>
  )
}
