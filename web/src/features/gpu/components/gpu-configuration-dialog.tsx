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
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SiNvidia } from 'react-icons/si'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

import type { GpuSpec } from '../data'

const gpuCounts = ['1', '2', '4', '8']

type GpuConfigurationDialogProps = {
  gpu: GpuSpec
  onClose: () => void
}

export function GpuConfigurationDialog(props: GpuConfigurationDialogProps) {
  const { t } = useTranslation()
  const id = useId()
  const [quantity, setQuantity] = useState('1')
  const [workload, setWorkload] = useState('inference')
  const totalVram = props.gpu.vramGb * Number(quantity)
  const workloads = [
    { value: 'inference', label: t('Inference') },
    { value: 'training', label: t('Training') },
  ]

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
      title={t('Configuration preview')}
      description={t(
        'This is a configuration preview. No resources are provisioned.'
      )}
      contentClassName='sm:max-w-xl'
      showCloseButton={false}
      footer={<Button onClick={props.onClose}>{t('Close')}</Button>}
    >
      <div className='space-y-6'>
        <div className='border-border flex items-center gap-3 rounded-lg border p-4'>
          <SiNvidia
            aria-hidden='true'
            className='size-9 shrink-0 text-[#76b900]'
          />
          <div>
            <h3 className='text-base font-semibold'>
              {props.gpu.vendor} {props.gpu.name}
            </h3>
            <p className='text-muted-foreground mt-1 text-sm'>
              {t('VRAM per GPU')}:{' '}
              {t('{{value}} GB', { value: props.gpu.vramGb })}
            </p>
          </div>
        </div>

        <div className='space-y-3'>
          <p id={`${id}-count-label`} className='text-sm font-medium'>
            {t('GPU count')}
          </p>
          <RadioGroup
            aria-labelledby={`${id}-count-label`}
            value={quantity}
            onValueChange={(value) => {
              if (gpuCounts.includes(String(value))) setQuantity(String(value))
            }}
            className='grid grid-cols-4 gap-2'
          >
            {gpuCounts.map((count) => (
              <Label
                key={count}
                htmlFor={`${id}-count-${count}`}
                className={cn(
                  'flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-3',
                  quantity === count
                    ? 'border-foreground bg-muted'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <RadioGroupItem id={`${id}-count-${count}`} value={count} />
                {count}
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className='space-y-3'>
          <p id={`${id}-workload-label`} className='text-sm font-medium'>
            {t('Workload')}
          </p>
          <RadioGroup
            aria-labelledby={`${id}-workload-label`}
            value={workload}
            onValueChange={(value) => {
              if (value === 'inference' || value === 'training') {
                setWorkload(value)
              }
            }}
            className='grid grid-cols-2 gap-2'
          >
            {workloads.map((item) => (
              <Label
                key={item.value}
                htmlFor={`${id}-workload-${item.value}`}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3',
                  workload === item.value
                    ? 'border-foreground bg-muted'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <RadioGroupItem
                  id={`${id}-workload-${item.value}`}
                  value={item.value}
                />
                {item.label}
              </Label>
            ))}
          </RadioGroup>
        </div>

        <dl className='border-border bg-muted/40 grid grid-cols-1 gap-5 rounded-lg border p-4 sm:grid-cols-2'>
          <div>
            <dt className='text-muted-foreground text-xs'>{t('Total VRAM')}</dt>
            <dd className='mt-1 font-mono text-xl font-medium tabular-nums'>
              {t('{{value}} GB', { value: totalVram })}
            </dd>
            <dd className='text-muted-foreground mt-1 text-xs'>
              {t('{{count}} × {{memory}} GB', {
                count: Number(quantity),
                memory: props.gpu.vramGb,
              })}
            </dd>
          </div>
          <div>
            <dt className='text-muted-foreground text-xs'>
              {t('Hourly price')}
            </dt>
            <dd className='mt-1 text-base font-medium'>
              {t('To be configured')}
            </dd>
          </div>
        </dl>
      </div>
    </Dialog>
  )
}
