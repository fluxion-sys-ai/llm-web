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
import { useTranslation } from 'react-i18next'

import { toIntlLocale } from '@/i18n/languages'
import { formatTokens } from '@/lib/format'

import type { Modality, PricingModel } from '../types'

const modalityLabels: Record<Modality, string> = {
  text: 'Text',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  file: 'File',
}

export function ModelCatalogSpecs(props: { model: PricingModel }) {
  const { t, i18n } = useTranslation()
  const metrics = [
    { label: t('Context window'), value: props.model.context_length },
    { label: t('Max output'), value: props.model.max_output_tokens },
  ].filter(
    (metric) =>
      metric.value != null && Number.isFinite(metric.value) && metric.value > 0
  )
  const modalities = [
    { label: t('Input types'), values: props.model.input_modalities },
    { label: t('Output types'), values: props.model.output_modalities },
  ].filter((item) => item.values && item.values.length > 0)

  if (metrics.length === 0 && modalities.length === 0) return null

  return (
    <dl
      aria-label={t('Model specifications')}
      className='border-border bg-muted/40 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border p-3 text-xs'
    >
      {metrics.map((metric) => (
        <div key={metric.label} className='min-w-0'>
          <dt className='text-muted-foreground'>{metric.label}</dt>
          <dd
            className='mt-1 font-mono text-sm font-medium tabular-nums'
            title={`${metric.value?.toLocaleString(toIntlLocale(i18n.language))} ${t('tokens')}`}
          >
            {formatTokens(metric.value ?? 0)}
          </dd>
        </div>
      ))}
      {modalities.map((item) => (
        <div key={item.label} className='min-w-0'>
          <dt className='text-muted-foreground'>{item.label}</dt>
          <dd className='mt-1 leading-5'>
            {item.values
              ?.map((modality) => t(modalityLabels[modality] ?? modality))
              .join(' · ')}
          </dd>
        </div>
      ))}
    </dl>
  )
}
