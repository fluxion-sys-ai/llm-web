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
import { Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { CodeBlock } from '@/components/ai-elements/code-block'
import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'

const chatExample = `curl "$FLUXION_API_BASE/chat/completions" \\
  -H "Authorization: Bearer $FLUXION_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "glm-5.3",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`

export function LlmIntegration() {
  const { t } = useTranslation()
  const capabilities = [
    t('Switch models with a model ID'),
    t('Manage keys in one place'),
    t('Track usage in your console'),
  ]

  return (
    <section
      aria-labelledby='llm-integration-title'
      className='border-border bg-background border-t'
    >
      <div className='mx-auto grid max-w-[1440px] items-center gap-10 px-6 py-16 lg:grid-cols-[5fr_7fr] lg:gap-14 lg:py-20'>
        <div className='min-w-0'>
          <h2
            id='llm-integration-title'
            className='max-w-lg text-[clamp(26px,3vw,36px)] leading-[1.1] font-semibold tracking-[-0.025em]'
          >
            {t('One API. Your choice of model.')}
          </h2>
          <p className='text-muted-foreground mt-5 max-w-lg text-base leading-7'>
            {t(
              'Connect supported models using the OpenAI-compatible Chat Completions format.'
            )}
          </p>
          <ul className='mt-6 flex flex-col gap-3 text-sm'>
            {capabilities.map((capability) => (
              <li key={capability} className='flex items-center gap-2.5'>
                <HugeiconsIcon
                  icon={Tick02Icon}
                  aria-hidden='true'
                  className='text-brand size-4 shrink-0'
                  strokeWidth={2}
                />
                <span>{capability}</span>
              </li>
            ))}
          </ul>
          <div className='mt-8 flex flex-wrap items-center gap-3'>
            <Button role='link' size='lg' render={<Link to='/docs' />}>
              {t('Read the docs')}
            </Button>
            <Button
              role='link'
              size='lg'
              variant='outline'
              render={<Link to='/keys' />}
            >
              {t('Get API Key')}
            </Button>
          </div>
        </div>
        <div className='min-w-0'>
          <CodeBlock
            className='border-border my-0 rounded-[10px] shadow-none'
            code={chatExample}
            language='bash'
            title='cURL'
            showToolbar
            enableCollapse={false}
          >
            <CopyButton value={chatExample} tooltip={t('Copy code')} />
          </CodeBlock>
          <p className='text-muted-foreground mt-3 text-xs leading-6'>
            {t(
              'Set FLUXION_API_BASE to your account API base URL (including /v1) and FLUXION_API_KEY to your own key.'
            )}
          </p>
        </div>
      </div>
    </section>
  )
}
