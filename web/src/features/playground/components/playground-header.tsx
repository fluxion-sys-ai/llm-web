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
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import { ModelGroupSelector } from '@/components/model-group-selector'

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
    <header className='border-border/60 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6'>
      <div className='flex min-w-0 items-center gap-4'>
        <h1 className='sr-only shrink-0 text-sm font-medium sm:not-sr-only'>
          {t('Playground')}
        </h1>
        <ModelGroupSelector
          className='bg-muted/50 hover:bg-muted max-w-full border-transparent sm:max-w-72'
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
      <PlaygroundInputTools {...toolsProps} />
    </header>
  )
}
