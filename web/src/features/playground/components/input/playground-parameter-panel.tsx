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
import { SlidersHorizontalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PromptInputButton } from '@/components/ai-elements/prompt-input'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

import {
  getParameterControlValueText,
  normalizeParameterNumberValue,
  PLAYGROUND_PARAMETER_CONTROLS,
  type PlaygroundParameterKey,
} from '../../lib/parameters/playground-parameters'
import type { ParameterEnabled, PlaygroundConfig } from '../../types'

type PlaygroundParameterPanelProps = {
  config: PlaygroundConfig
  disabled?: boolean
  onConfigChange: <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K]
  ) => void
  onParameterEnabledChange: (
    key: PlaygroundParameterKey,
    value: boolean
  ) => void
  parameterEnabled: ParameterEnabled
}

function PlaygroundParameterContent({
  config,
  disabled,
  onConfigChange,
  onParameterEnabledChange,
  parameterEnabled,
}: PlaygroundParameterPanelProps) {
  const { t } = useTranslation()

  const updateParameterConfig = (
    key: PlaygroundParameterKey,
    value: number | null
  ) => {
    if (key === 'seed') {
      onConfigChange('seed', value)
      return
    }

    onConfigChange(key, value ?? 0)
  }

  return (
    <div className='min-h-0 overflow-y-auto px-5 pb-5'>
      {PLAYGROUND_PARAMETER_CONTROLS.map((control) => {
        const enabled = parameterEnabled[control.key]
        const value = config[control.key]
        const controlId = `playground-${control.key}`

        return (
          <div
            className='border-border/60 grid gap-3 border-b py-5 last:border-b-0'
            key={control.key}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0 space-y-1'>
                <div className='flex min-w-0 items-center gap-2'>
                  <label
                    className='truncate text-sm leading-5 font-medium'
                    htmlFor={controlId}
                  >
                    {t(control.labelKey)}
                  </label>
                  <Badge
                    className='h-5 max-w-24 shrink-0 px-1.5 font-mono text-[11px] font-normal'
                    variant='secondary'
                  >
                    {t(getParameterControlValueText(control.key, value))}
                  </Badge>
                </div>
                <p className='text-muted-foreground text-xs leading-4'>
                  {t(control.descriptionKey)}
                </p>
              </div>

              <Switch
                aria-label={t('Enable {{parameter}}', {
                  parameter: t(control.labelKey),
                })}
                checked={enabled}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  onParameterEnabledChange(control.key, checked)
                }
                size='sm'
              />
            </div>

            {control.valueType === 'slider' ? (
              <Slider
                className='py-1.5'
                disabled={disabled || !enabled}
                id={controlId}
                max={control.max}
                min={control.min}
                onValueChange={(nextValue) => {
                  const firstValue = Array.isArray(nextValue)
                    ? nextValue[0]
                    : nextValue
                  updateParameterConfig(
                    control.key,
                    normalizeParameterNumberValue(control.key, firstValue)
                  )
                }}
                step={control.step}
                value={[Number(value)]}
              />
            ) : (
              <Input
                disabled={disabled || !enabled}
                id={controlId}
                inputMode='numeric'
                max={control.max}
                min={control.min}
                onChange={(event) => {
                  updateParameterConfig(
                    control.key,
                    normalizeParameterNumberValue(
                      control.key,
                      event.target.value
                    )
                  )
                }}
                step={control.step}
                type='number'
                value={value ?? ''}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function PlaygroundParameterPanel(props: PlaygroundParameterPanelProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const activeCount = PLAYGROUND_PARAMETER_CONTROLS.filter(
    (control) => props.parameterEnabled[control.key]
  ).length

  return (
    <Sheet>
      <Tooltip>
        <TooltipTrigger
          render={
            <SheetTrigger
              render={
                <PromptInputButton
                  aria-label={t('Parameters')}
                  className='text-muted-foreground hover:text-foreground h-8 gap-2 px-2'
                  disabled={props.disabled}
                  variant='ghost'
                >
                  <SlidersHorizontalIcon
                    aria-hidden='true'
                    className='size-4'
                  />
                  <span className='hidden sm:inline'>{t('Parameters')}</span>
                  <Badge
                    aria-hidden='true'
                    className='h-5 min-w-5 justify-center px-1 text-[10px] font-medium'
                    variant='secondary'
                  >
                    {activeCount}
                  </Badge>
                </PromptInputButton>
              }
            />
          }
        />
        <TooltipContent>{t('Parameters')}</TooltipContent>
      </Tooltip>
      <SheetContent
        className={cn(
          'gap-0',
          isMobile ? 'max-h-[85svh] rounded-t-2xl' : 'w-full sm:max-w-sm'
        )}
        side={isMobile ? 'bottom' : 'right'}
      >
        <SheetHeader className='border-border/60 shrink-0 gap-2 border-b px-5 pt-5 pb-4'>
          <SheetTitle>{t('Parameter settings')}</SheetTitle>
          <SheetDescription className='pr-5 text-xs leading-5'>
            {t('Only enabled parameters are sent with the request.')}
          </SheetDescription>
        </SheetHeader>
        <PlaygroundParameterContent {...props} />
      </SheetContent>
    </Sheet>
  )
}
