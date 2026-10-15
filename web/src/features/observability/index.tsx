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
// Grafana is a trusted same-origin application. Its API calls require scripts
// and same-origin cookies; the backend proxy enforces access on every request.
/* oxlint-disable react/iframe-missing-sandbox */
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'
import { Main } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'

import { useDashboardSession, useObservability } from './use-observability'

export function Observability() {
  const { t } = useTranslation()
  const configuration = useObservability()
  const session = useDashboardSession(configuration.available)

  let content
  if (
    configuration.isPending ||
    (configuration.available && session.isPending)
  ) {
    content = <LoadingState message={t('Opening dashboard…')} />
  } else if (!configuration.available) {
    content = (
      <ErrorState
        title={t('Observability is unavailable')}
        description={t(
          'The monitoring dashboard is not enabled or could not be reached. Try again or check the deployment.'
        )}
        onRetry={() => {
          void configuration.refetch()
        }}
      />
    )
  } else if (!session.url) {
    content = (
      <ErrorState
        title={t('Unable to open dashboard')}
        description={t(
          'Dashboard access could not be renewed. Retry, or sign in again if your session has expired.'
        )}
        onRetry={() => {
          void session.refetch()
        }}
      />
    )
  } else {
    content = (
      <iframe
        src={session.url}
        title={t('Observability')}
        sandbox='allow-scripts allow-same-origin allow-forms allow-popups allow-downloads'
        className='h-full min-h-0 w-full flex-1 border-0'
      />
    )
  }

  return (
    <Main>
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-8'>
        <h1 className='text-xl font-semibold'>{t('Observability')}</h1>
        {session.url && (
          <Button
            role='link'
            variant='outline'
            size='sm'
            render={
              <a
                href='/observability'
                target='_blank'
                rel='noopener noreferrer'
              />
            }
          >
            {t('Open in new tab')}
          </Button>
        )}
      </div>
      <div className='flex min-h-0 flex-1 flex-col overflow-auto'>
        {content}
      </div>
    </Main>
  )
}
