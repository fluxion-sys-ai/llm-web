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
import { MessageSquarePlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

type PlaygroundEmptyStateProps = {
  onSelectPrompt: (prompt: string) => void
}

export function PlaygroundEmptyState(props: PlaygroundEmptyStateProps) {
  const { t } = useTranslation()
  const starterPrompts = [
    {
      label: t('Explain a concept'),
      prompt: t(
        'Explain the difference between an API and an SDK with a simple example.'
      ),
    },
    {
      label: t('Draft an email'),
      prompt: t(
        'Draft a short, friendly email asking a teammate for feedback on a project proposal.'
      ),
    },
    {
      label: t('Write code'),
      prompt: t(
        'Write a Python function that removes duplicates from a list while preserving order. Include an example.'
      ),
    },
    {
      label: t('Compare options'),
      prompt: t(
        'Compare REST and GraphQL in a table, including a practical use case for each.'
      ),
    },
  ]

  return (
    <EmptyState
      className='min-h-[min(520px,calc(100svh-18rem))] px-1 py-8 md:py-12'
      icon={MessageSquarePlusIcon}
      title={t('Start a playground chat')}
      description={t(
        'Choose a model below, then try an example or write your own message.'
      )}
      action={
        <div className='grid w-full gap-2 sm:grid-cols-2'>
          {starterPrompts.map((starter) => (
            <Button
              className='h-auto min-h-11 justify-start px-3 py-2.5 whitespace-normal'
              key={starter.label}
              onClick={() => props.onSelectPrompt(starter.prompt)}
              variant='outline'
            >
              {starter.label}
            </Button>
          ))}
        </div>
      }
    />
  )
}
