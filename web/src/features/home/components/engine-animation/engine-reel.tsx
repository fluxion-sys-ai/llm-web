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
import { Check, type LucideIcon } from 'lucide-react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { wrapIndex } from './timeline'

const REEL_SLOTS = [-2, -1, 0, 1, 2] as const

type EngineReelProps = {
  label: string
  icon: LucideIcon
  items: readonly string[]
  position: number
  locked: boolean
  boxRef: RefObject<HTMLDivElement | null>
  reelRef: RefObject<HTMLDivElement | null>
}

export function EngineReel(props: EngineReelProps) {
  const { t } = useTranslation()
  const Icon = props.icon
  const base = Math.floor(props.position)
  const fraction = props.position - base

  return (
    <div
      ref={props.boxRef}
      className={cn('ea-input', props.locked && 'ea-locked')}
      aria-hidden='true'
    >
      <div className='ea-field-label'>
        <Icon aria-hidden='true' />
        {props.label}
        <span className='ea-lock-state'>
          {props.locked && <Check aria-hidden='true' />}
          {props.locked ? t('Locked') : t('Matching')}
        </span>
      </div>
      <div ref={props.reelRef} className='ea-reel' aria-hidden='true'>
        <div className='ea-selection-lane' />
        {REEL_SLOTS.map((slot) => {
          const offset = slot - fraction
          return (
            <div
              key={slot}
              className={cn(
                'ea-reel-row',
                Math.abs(offset) < 0.5 && 'ea-candidate'
              )}
              style={{ transform: `translateY(${(offset * 26).toFixed(2)}px)` }}
            >
              {props.items[wrapIndex(base + slot, props.items.length)]}
            </div>
          )
        })}
      </div>
    </div>
  )
}
