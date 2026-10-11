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
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import '@/styles/engine-illustration.css'

type EngineIllustrationProps = { className?: string }

export function EngineIllustration(props: EngineIllustrationProps) {
  const { t } = useTranslation()
  const prefix = useId()
  const descriptionId = `${prefix}-description`

  return (
    <figure
      aria-labelledby={descriptionId}
      className={cn('engine-illustration', props.className)}
    >
      <figcaption id={descriptionId} className='sr-only'>
        {t(
          'An AI optimizer builds, benchmarks and optimizes an inference engine while a stream of tokens runs through it. The drawing is an illustration.'
        )}
      </figcaption>
      <img
        src='/images/inference-engine-optimizer.webp'
        width={1536}
        height={1024}
        alt=''
        aria-hidden='true'
        fetchPriority='high'
        decoding='async'
        className='ei-artwork'
      />
      <svg
        viewBox='0 0 800 540'
        aria-hidden='true'
        focusable='false'
        className='ei-svg'
      >
        {/* The artwork draws the leader lines and the loop; the words stay
            live translated text, placed where the artwork leaves room. The
            first loop label grows left and the last grows right, so longer
            translations stay clear of the arrows between them. */}
        <text x='524' y='95' className='ei-label'>
          {t('AI optimizer')}
        </text>
        <text x='500' y='440' className='ei-label'>
          {t('Inference engine')}
        </text>
        <text x='260' y='503' textAnchor='end' className='ei-label'>
          {t('Build')}
        </text>
        <text x='423' y='503' textAnchor='middle' className='ei-label'>
          {t('Benchmark')}
        </text>
        <text x='588' y='503' className='ei-label'>
          {t('Optimize')}
        </text>
      </svg>
    </figure>
  )
}
