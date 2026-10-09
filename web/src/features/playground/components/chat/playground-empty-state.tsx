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
import {
  BookOpenIcon,
  Code2Icon,
  Columns2Icon,
  MailIcon,
  MessageSquarePlusIcon,
} from 'lucide-react'
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
      icon: BookOpenIcon,
      prompt: t(
        'Explain the difference between an API and an SDK with a simple example.'
      ),
    },
    {
      label: t('Draft an email'),
      icon: MailIcon,
      prompt: t(
        'Draft a short, friendly email asking a teammate for feedback on a project proposal.'
      ),
    },
    {
      label: t('Write code'),
      icon: Code2Icon,
      prompt: t(
        'Write a Python function that removes duplicates from a list while preserving order. Include an example.'
      ),
    },
    {
      label: t('Compare options'),
      icon: Columns2Icon,
      prompt: t(
        'Compare REST and GraphQL in a table, including a practical use case for each.'
      ),
    },
  ]

  return (
    <EmptyState
      className='min-h-[min(520px,calc(100svh-20rem))] gap-7 px-1 py-8 sm:py-12 [&_[data-slot=empty-title]]:text-2xl [&_[data-slot=empty-title]]:font-medium [&_[data-slot=empty-title]]:tracking-tight'
      icon={MessageSquarePlusIcon}
      title={t('Start a conversation')}
      description={t(
        'Choose a model, then try an example or write your own message.'
      )}
      action={
        <div className='grid w-full gap-2 sm:grid-cols-2'>
          {starterPrompts.map((starter) => (
            <Button
              className='text-muted-foreground hover:text-foreground h-auto min-h-12 justify-start gap-3 rounded-xl px-4 py-3 font-normal whitespace-normal'
              key={starter.label}
              onClick={() => props.onSelectPrompt(starter.prompt)}
              variant='secondary'
            >
              <starter.icon aria-hidden='true' className='size-4' />
              {starter.label}
            </Button>
          ))}
        </div>
      }
    />
  )
}
