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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  PromptInput,
  PromptInputFooter,
  PromptInputTextarea,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'

import { getSubmittableInputText } from '../../lib'
import type { GroupOption, ModelOption } from '../../types'
import { PlaygroundInputControls } from './playground-input-controls'

interface PlaygroundInputProps {
  onSubmit: (text: string) => void
  onStop?: () => void
  disabled?: boolean
  isGenerating?: boolean
  models: ModelOption[]
  isModelLoading?: boolean
  groups: GroupOption[]
}

export function PlaygroundInput({
  onSubmit,
  onStop,
  disabled,
  isGenerating,
  models,
  isModelLoading = false,
  groups,
}: PlaygroundInputProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')

  const handleSubmit = (message: PromptInputMessage) => {
    const submittableText = getSubmittableInputText(message, disabled)

    if (!submittableText) return
    onSubmit(submittableText)
    setText('')
  }

  return (
    <div className='shrink-0 px-4 pt-2 pb-4 sm:px-6 sm:pb-6'>
      <PromptInput
        groupClassName='bg-background border-border overflow-hidden rounded-2xl shadow-sm transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/15'
        onSubmit={handleSubmit}
      >
        <PromptInputTextarea
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='off'
          spellCheck={false}
          className='min-h-20 px-4 pt-4 pb-2 text-base leading-7 sm:px-5'
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('Ask anything')}
          value={text}
        />

        <PromptInputFooter className='justify-end px-3 pt-0 pb-3'>
          <PlaygroundInputControls
            disabled={disabled}
            groups={groups}
            isGenerating={isGenerating}
            isModelLoading={isModelLoading}
            models={models}
            onStop={onStop}
            text={text}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
