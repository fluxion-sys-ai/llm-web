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
import { useId, useState } from 'react'
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
  const hintId = useId()

  const handleSubmit = (message: PromptInputMessage) => {
    const submittableText = getSubmittableInputText(message, disabled)

    if (!submittableText) return
    onSubmit(submittableText)
    setText('')
  }

  return (
    <div className='shrink-0 px-4 pt-2 pb-4 sm:px-6 sm:pb-6'>
      <PromptInput
        groupClassName='bg-background border-border has-disabled:bg-background has-disabled:opacity-100 overflow-hidden rounded-2xl shadow-sm transition-shadow focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/10'
        onSubmit={handleSubmit}
      >
        <PromptInputTextarea
          aria-describedby={hintId}
          aria-label={t('Ask anything')}
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='off'
          spellCheck={false}
          className='min-h-20 px-4 pt-4 pb-2 text-base leading-7 sm:px-5 sm:pt-5'
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('Ask anything')}
          value={text}
        />

        <PromptInputFooter className='items-end justify-between gap-3 px-3 pt-0 pb-3 sm:pl-5'>
          <p
            className='text-muted-foreground max-w-56 py-1 text-[11px] leading-5 sm:max-w-none'
            id={hintId}
          >
            {t('Enter to send, Shift + Enter for a new line')}
          </p>
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
