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
import { ArrowUpIcon, SquareIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PromptInputButton } from '@/components/ai-elements/prompt-input'

import { getInputControlState } from '../../lib'
import type { GroupOption, ModelOption } from '../../types'

type PlaygroundInputControlsProps = {
  disabled?: boolean
  groups: GroupOption[]
  isGenerating?: boolean
  isModelLoading?: boolean
  models: ModelOption[]
  onStop?: () => void
  text: string
}

export function PlaygroundInputControls({
  disabled,
  groups,
  isGenerating,
  isModelLoading = false,
  models,
  onStop,
  text,
}: PlaygroundInputControlsProps) {
  const { t } = useTranslation()
  const { canSubmit, shouldShowStop } = getInputControlState({
    disabled,
    groups,
    hasStopHandler: Boolean(onStop),
    isGenerating,
    isModelLoading,
    models,
    text,
  })

  return shouldShowStop ? (
    <PromptInputButton
      aria-label={t('Stop')}
      className='size-9 rounded-full'
      onClick={onStop}
      size='icon-sm'
      variant='secondary'
    >
      <SquareIcon aria-hidden='true' className='size-3.5 fill-current' />
    </PromptInputButton>
  ) : (
    <PromptInputButton
      aria-label={t('Send')}
      className='size-9 rounded-full'
      disabled={!canSubmit}
      size='icon-sm'
      type='submit'
      variant='default'
    >
      <ArrowUpIcon aria-hidden='true' className='size-4' />
    </PromptInputButton>
  )
}
