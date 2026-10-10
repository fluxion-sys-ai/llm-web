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
import { Pause, Play, Sparkles } from 'lucide-react'
import { Fragment, memo, useId, useMemo, useRef, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import '@/styles/engine-lattice.css'

import {
  getEnginePattern,
  getLatticeFrame,
  LATTICE_CHIPS,
  LATTICE_MODELS,
  type LatticeCellState,
} from './timeline'
import { useEngineClock } from './use-engine-clock'

const FLICKER_TICKS_PER_SECOND = 24

type LatticeCellProps = {
  row: number
  col: number
  state: LatticeCellState
  // Only advances while the cell is being built, so settled cells skip re-renders.
  flickerTick: number
}

const LatticeCell = memo(function LatticeCell(props: LatticeCellProps) {
  const pattern = useMemo(
    () => getEnginePattern(props.row, props.col),
    [props.row, props.col]
  )
  return (
    <div className={cn('el-cell', `el-${props.state}`)}>
      <span className='el-tiles'>
        {pattern.map((tile, index) => {
          let lit = false
          if (props.state === 'ready') lit = tile.on
          else if (props.state === 'building') {
            lit =
              (props.flickerTick * 7 +
                index * 13 +
                props.row * 3 +
                props.col * 5) %
                5 <
              2
          }
          return (
            <span
              key={tile.id}
              className={cn(
                'el-tile',
                lit && 'el-on',
                lit && props.state === 'ready' && tile.accent && 'el-accent'
              )}
            />
          )
        })}
      </span>
    </div>
  )
})

type EngineLatticeProps = { className?: string }

export function EngineLattice(props: EngineLatticeProps) {
  const { t } = useTranslation()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const clock = useEngineClock(panelRef)
  const frame = getLatticeFrame(clock.elapsed)
  const flickerTick =
    frame.stage === 'building'
      ? Math.floor(clock.elapsed * FLICKER_TICKS_PER_SECOND)
      : 0
  const status = frame.active
    ? t('Building {{model}} × {{chip}}', {
        model: LATTICE_MODELS[frame.active.row],
        chip: LATTICE_CHIPS[frame.active.col],
      })
    : t('Every pair has its own engine')

  return (
    <div className={cn('engine-lattice', props.className)}>
      <figure aria-labelledby={descriptionId}>
        <figcaption id={descriptionId} className='sr-only'>
          {t(
            'An inference engine is built for every model and chip pairing. This illustration cycles through example pairings and does not show live availability.'
          )}
        </figcaption>
        <div ref={panelRef} className='el-panel' data-stage={frame.stage}>
          <div className='el-head'>
            <span className='el-title'>
              <Sparkles aria-hidden='true' />
              {t('Engines built by AI')}
            </span>
            <span className='el-status' aria-hidden='true'>
              {status}
            </span>
          </div>
          <div className='el-matrix' aria-hidden='true'>
            <span className='el-axis el-axis-model'>{t('Any model')}</span>
            <div
              className='el-grid'
              style={{ '--el-cols': LATTICE_CHIPS.length } as CSSProperties}
            >
              <span className='el-axis el-axis-chip'>{t('Any chip')}</span>
              <span className='el-corner' />
              {LATTICE_CHIPS.map((chip) => (
                <span key={chip} className='el-chip'>
                  {chip}
                </span>
              ))}
              {LATTICE_MODELS.map((model, row) => (
                <Fragment key={model}>
                  <span className='el-model'>{model}</span>
                  {LATTICE_CHIPS.map((chip, col) => (
                    <LatticeCell
                      key={chip}
                      row={row}
                      col={col}
                      state={frame.cells[row * LATTICE_CHIPS.length + col].state}
                      flickerTick={
                        frame.cells[row * LATTICE_CHIPS.length + col].state ===
                        'building'
                          ? flickerTick
                          : 0
                      }
                    />
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
          <div className='el-foot' aria-hidden='true'>
            <span className='el-equation'>
              <span>{t('Any model')}</span>
              <span className='el-times'>×</span>
              <span>{t('Any chip')}</span>
              <span className='el-arrow'>→</span>
            </span>
            <span className='el-result'>{t('Lowest cost')}</span>
          </div>
        </div>
      </figure>
      <div className='el-controls'>
        <Button
          variant='outline'
          size='sm'
          className='el-pause'
          aria-label={
            clock.playing ? t('Pause animation') : t('Play animation')
          }
          onClick={clock.togglePlayback}
        >
          {clock.playing ? (
            <Pause aria-hidden='true' data-icon='inline-start' />
          ) : (
            <Play aria-hidden='true' data-icon='inline-start' />
          )}
          {clock.playing ? t('Pause') : t('Play')}
        </Button>
      </div>
    </div>
  )
}
