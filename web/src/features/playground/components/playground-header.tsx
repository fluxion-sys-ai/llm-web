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
import { MessageSquareTextIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import { ModelGroupSelector } from '@/components/model-group-selector'
import { Separator } from '@/components/ui/separator'

import type { GroupOption, ModelOption } from '../types'
import { PlaygroundInputTools } from './input/playground-input-tools'

type PlaygroundHeaderProps = ComponentProps<typeof PlaygroundInputTools> & {
  groups: GroupOption[]
  isModelLoading: boolean
  models: ModelOption[]
}

export function PlaygroundHeader({
  groups,
  isModelLoading,
  models,
  ...toolsProps
}: PlaygroundHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className='border-border/70 bg-muted/15 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 border-b px-4 py-3 sm:flex sm:gap-4 sm:px-6'>
      <div className='flex shrink-0 items-center gap-2.5'>
        <span className='border-border bg-background flex size-8 items-center justify-center rounded-lg border'>
          <MessageSquareTextIcon aria-hidden='true' className='size-4' />
        </span>
        <h1 className='text-sm font-semibold tracking-tight'>
          {t('Playground')}
        </h1>
      </div>
      <Separator
        className='hidden h-6 self-center sm:block'
        orientation='vertical'
      />
      <div className='col-span-2 row-start-2 min-w-0 sm:mr-auto'>
        <ModelGroupSelector
          className='bg-background h-9 w-full max-w-full sm:w-auto sm:max-w-80'
          disabled={
            toolsProps.disabled || isModelLoading || groups.length === 0
          }
          groups={groups}
          models={models}
          onGroupChange={(value) => toolsProps.onConfigChange('group', value)}
          onModelChange={(value) => toolsProps.onConfigChange('model', value)}
          selectedGroup={toolsProps.config.group}
          selectedModel={toolsProps.config.model}
        />
      </div>
      <div className='col-start-2 row-start-1'>
        <PlaygroundInputTools {...toolsProps} />
      </div>
    </header>
  )
}
