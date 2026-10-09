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
import { BrainCircuit, Cpu, Pause, Play } from 'lucide-react'
import { useId, useMemo, useRef, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import '@/styles/engine-animation.css'

import { EngineConnectors } from './engine-connectors'
import { EngineReel } from './engine-reel'
import {
  ENGINE_GPUS,
  ENGINE_MODELS,
  getEngineFrame,
  getEnginePattern,
} from './timeline'
import { useEngineClock } from './use-engine-clock'

type EngineAnimationProps = { className?: string }

export function EngineAnimation(props: EngineAnimationProps) {
  const { t } = useTranslation()
  const descriptionId = useId()
  const diagramRef = useRef<HTMLDivElement>(null)
  const gpuRef = useRef<HTMLDivElement>(null)
  const llmRef = useRef<HTMLDivElement>(null)
  const gpuReelRef = useRef<HTMLDivElement>(null)
  const llmReelRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<HTMLDivElement>(null)
  const clock = useEngineClock(diagramRef)
  const frame = getEngineFrame(clock.elapsed)
  const pattern = useMemo(() => getEnginePattern(frame.pair), [frame.pair])
  const stageLabels = {
    gpu: t('Matching GPU'),
    llm: t('Matching LLM'),
    locked: t('Pair locked'),
    merging: t('Creating personalized engine'),
    ready: t('Personalized engine'),
  }

  return (
    <div className={cn('engine-animation', props.className)}>
      <figure aria-labelledby={descriptionId}>
        <figcaption id={descriptionId} className='sr-only'>
          {t(
            'GPU and LLM options lock into a pair, then combine into a personalized inference engine. This illustration cycles through example pairings.'
          )}
        </figcaption>
        <div ref={diagramRef} className='ea-diagram' data-stage={frame.stage}>
          <EngineConnectors
            diagramRef={diagramRef}
            gpuRef={gpuRef}
            llmRef={llmRef}
            gpuReelRef={gpuReelRef}
            llmReelRef={llmReelRef}
            engineRef={engineRef}
            frame={frame}
          />
          <div className='ea-inputs'>
            <EngineReel
              label={t('GPU')}
              icon={Cpu}
              items={ENGINE_GPUS}
              position={frame.gpuPosition}
              locked={frame.gpuLocked}
              boxRef={gpuRef}
              reelRef={gpuReelRef}
            />
            <EngineReel
              label={t('LLM')}
              icon={BrainCircuit}
              items={ENGINE_MODELS}
              position={frame.llmPosition}
              locked={frame.llmLocked}
              boxRef={llmRef}
              reelRef={llmReelRef}
            />
          </div>
          <div
            ref={engineRef}
            className={cn('ea-engine', frame.ready && 'ea-ready')}
            style={
              {
                '--engine-flash': frame.flash,
                '--engine-scale': frame.scale,
              } as CSSProperties
            }
          >
            <div className='ea-engine-symbol' aria-hidden='true'>
              <div className='ea-engine-matrix'>
                {pattern.map((tile) => (
                  <span
                    key={tile.id}
                    className={cn(
                      'ea-tile',
                      frame.ready && tile.on && 'ea-on',
                      frame.ready && tile.dark && 'ea-dark'
                    )}
                    style={{
                      transform: `translateY(${frame.ready ? tile.offset : 0}px)`,
                    }}
                  />
                ))}
              </div>
            </div>
            <h2>{t('Personalized Engine')}</h2>
            <p className='ea-engine-pair' aria-hidden='true'>
              <span className='ea-output-llm'>
                {frame.ready ? ENGINE_MODELS[frame.pair[1]] : t('GPU × LLM')}
              </span>
              <span>
                {frame.ready
                  ? `× ${ENGINE_GPUS[frame.pair[0]]}`
                  : t('A specialized engine for each pair')}
              </span>
            </p>
          </div>
        </div>
      </figure>
      <div className='ea-loop-controls'>
        <span className='ea-step' aria-hidden='true'>
          {stageLabels[frame.stage]}
        </span>
        <Button
          variant='outline'
          size='sm'
          className='ea-pause'
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
