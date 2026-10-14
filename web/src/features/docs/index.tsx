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
import { Link } from '@tanstack/react-router'
import { BookOpen, KeyRound, Layers, MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  CodeBlock,
  CodeBlockCopyButton,
} from '@/components/ai-elements/code-block'
import { PublicLayout } from '@/components/layout'
import { Footer } from '@/components/layout/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const chatExample = `export FLUXION_API_BASE="https://api.fluxion-sys.ai/v1"
export FLUXION_API_KEY="YOUR_API_KEY"

curl "$FLUXION_API_BASE/chat/completions" \\
  -H "Authorization: Bearer $FLUXION_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "YOUR_MODEL_ID",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`

export function Docs() {
  const { t } = useTranslation()
  const steps = [
    {
      id: 'model',
      icon: Layers,
      title: t('Choose a Model'),
      description: t(
        'Compare available models and pricing. Copy the exact model ID when connecting an application.'
      ),
      action: t('Explore Models'),
      to: '/pricing',
    },
    {
      id: 'chat',
      icon: MessageSquare,
      title: t('Try a Conversation'),
      description: t(
        'Sign in, open the Playground, choose a model, and send a prompt. Use Parameters to adjust the conversation settings.'
      ),
      action: t('Open Playground'),
      to: '/playground',
    },
    {
      id: 'key',
      icon: KeyRound,
      title: t('Connect your application'),
      description: t(
        'Create an API key, select its permissions and limits, and use it in your application server.'
      ),
      action: t('Get API Key'),
      to: '/keys',
    },
  ] as const

  return (
    <PublicLayout showMainContainer={false}>
      <main className='mx-auto w-full max-w-[1440px] px-6 pt-28 pb-16'>
        <div className='mb-10 max-w-2xl'>
          <BookOpen aria-hidden='true' className='text-brand mb-4 size-7' />
          <h1 className='text-4xl leading-[1.1] font-semibold tracking-[-0.025em] sm:text-[40px]'>
            {t('Fluxion LLM Docs')}
          </h1>
          <p className='text-muted-foreground mt-4 text-base leading-relaxed'>
            {t(
              'Go from selecting a model to your first conversation or API call.'
            )}
          </p>
        </div>

        <section aria-labelledby='quick-start-heading'>
          <h2 id='quick-start-heading' className='mb-5 text-xl font-semibold'>
            {t('Quick start')}
          </h2>
          <div className='grid gap-4 md:grid-cols-3'>
            {steps.map((step, index) => (
              <Card key={step.id} className='gap-5'>
                <CardHeader>
                  <div className='text-muted-foreground mb-3 flex items-center justify-between'>
                    <step.icon aria-hidden='true' className='size-5' />
                    <span aria-hidden='true' className='font-mono text-sm'>
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className='text-base font-medium'>{step.title}</h3>
                </CardHeader>
                <CardContent className='flex flex-1 flex-col items-start gap-5'>
                  <p className='text-muted-foreground flex-1 leading-relaxed'>
                    {step.description}
                  </p>
                  <Button
                    role='link'
                    variant='outline'
                    render={<Link to={step.to} />}
                  >
                    {step.action}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section
          aria-labelledby='api-example-heading'
          className='mt-12 max-w-4xl'
        >
          <h2 id='api-example-heading' className='text-xl font-semibold'>
            {t('Make an API request')}
          </h2>
          <p className='text-muted-foreground mt-3 text-sm leading-relaxed'>
            {t(
              'For models that support the OpenAI-compatible Chat Completions endpoint, use this cURL example. Replace all three placeholders before running it.'
            )}
          </p>
          <p className='text-muted-foreground mt-3 text-sm leading-relaxed'>
            {t(
              'Use the API base URL supplied for your account, including /v1. The website address is not necessarily the API base URL.'
            )}
          </p>
          <CodeBlock
            className='mt-5 rounded-xl border-[#e4ebf5] bg-[#f7f9fe] shadow-none dark:border-white/10 dark:bg-[#101219]'
            code={chatExample}
            language='bash'
            title='cURL'
            showToolbar
            enableCollapse={false}
          >
            <CodeBlockCopyButton />
          </CodeBlock>
          <p className='text-muted-foreground mt-3 text-sm leading-relaxed'>
            {t(
              'Keep API keys on your server or in environment variables. Do not put them in browser code or commit them to Git.'
            )}
          </p>
        </section>

        <section
          aria-labelledby='usage-help-heading'
          className='border-border mt-12 grid gap-8 border-t pt-8 md:grid-cols-2'
        >
          <div>
            <h2 id='usage-help-heading' className='text-xl font-semibold'>
              {t('Track your usage')}
            </h2>
            <p className='text-muted-foreground mt-3 text-sm leading-relaxed'>
              {t(
                'Use the dashboard to review usage, and check Usage Logs for individual requests and errors.'
              )}
            </p>
            <div className='mt-5 flex flex-wrap gap-3'>
              <Button
                role='link'
                variant='outline'
                render={<Link to='/dashboard' />}
              >
                {t('Dashboard')}
              </Button>
              <Button
                role='link'
                variant='ghost'
                render={
                  <Link
                    to='/usage-logs/$section'
                    params={{ section: 'common' }}
                  />
                }
              >
                {t('Usage Logs')}
              </Button>
            </div>
          </div>
          <div>
            <h2 className='text-xl font-semibold'>
              {t('Before you retry a failed request')}
            </h2>
            <ul className='text-muted-foreground mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed'>
              <li>
                {t(
                  'Check that the API key is active and has access to the selected model.'
                )}
              </li>
              <li>
                {t(
                  'Confirm the model ID and supported endpoint in Models & Pricing.'
                )}
              </li>
              <li>
                {t(
                  'Review your balance, key limits, and the error shown in Usage Logs.'
                )}
              </li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </PublicLayout>
  )
}
