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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { StaticDataTable } from '@/components/data-table'
import {
  SideDrawerSection,
  SideDrawerSectionHeader,
} from '@/components/drawer-layout'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'

import { getPromotionCodes, stopPromotion } from '../api'
import { usePromotionClock } from '../hooks/use-promotion-clock'
import { getPromotionStatus } from '../lib/promotion-status'
import type { Promotion } from '../types'
import { PromotionDetails } from './promotion-details'

const emptyPromotions: Promotion[] = []

export function PromotionCodesList(props: {
  userId: number
  enabled: boolean
  canWrite: boolean
}) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [action, setAction] = useState<{
    id: number
    type: 'disable' | 'revoke'
  } | null>(null)
  const query = useQuery({
    queryKey: ['promotion-codes', props.userId, page],
    queryFn: () => getPromotionCodes(props.userId, page),
  })
  const promotions = query.data?.items ?? emptyPromotions
  const now = usePromotionClock(promotions)
  const stop = useMutation({
    mutationFn: (target: { id: number; type: 'disable' | 'revoke' }) =>
      stopPromotion(target.id, target.type),
    onSuccess: () => {
      setAction(null)
      void client.invalidateQueries({
        queryKey: ['promotion-codes', props.userId],
      })
      void client.invalidateQueries({ queryKey: ['customer-benefits'] })
    },
  })
  return (
    <SideDrawerSection>
      <SideDrawerSectionHeader title={t('Promotion codes')} />
      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState onRetry={() => void query.refetch()} />}
      {query.data && (
        <>
          <StaticDataTable
            data={promotions}
            getRowKey={(promotion) => promotion.id}
            emptyContent={t('No promotion codes')}
            columns={[
              {
                id: 'benefit',
                header: t('Promotion'),
                cell: (promotion) => (
                  <PromotionDetails
                    promotion={promotion}
                    now={now}
                    enabled={props.enabled}
                  />
                ),
              },
              {
                id: 'code',
                header: t('Code'),
                cell: (promotion) => (
                  <span className='font-mono text-xs'>
                    {promotion.code_mask}
                  </span>
                ),
              },
              {
                id: 'action',
                header: t('Actions'),
                cell: (promotion) => {
                  if (!props.canWrite) return null
                  const status = getPromotionStatus(promotion, now)
                  if (status !== 'available' && status !== 'active') return null
                  const type = status === 'available' ? 'disable' : 'revoke'
                  return (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setAction({ id: promotion.id, type })}
                    >
                      {type === 'disable'
                        ? t('Disable code')
                        : t('Revoke benefit')}
                    </Button>
                  )
                },
              },
            ]}
          />
          {(query.data.total > 10 || page > 1) && (
            <div className='flex items-center justify-between gap-2'>
              <Button
                variant='outline'
                size='sm'
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                {t('Previous')}
              </Button>
              <span className='text-muted-foreground text-sm'>
                {t('Page {{page}}', { page })}
              </span>
              <Button
                variant='outline'
                size='sm'
                disabled={page * 10 >= query.data.total}
                onClick={() => setPage((value) => value + 1)}
              >
                {t('Next')}
              </Button>
            </div>
          )}
        </>
      )}
      <ConfirmDialog
        open={action !== null}
        onOpenChange={(open) => !open && setAction(null)}
        title={
          action?.type === 'revoke' ? t('Revoke benefit') : t('Disable code')
        }
        desc={
          action?.type === 'revoke'
            ? t(
                'This discount will stop immediately. Past charges will not change.'
              )
            : t('This code will no longer be redeemable.')
        }
        confirmText={t('Confirm')}
        handleConfirm={() => action && stop.mutate(action)}
        isLoading={stop.isPending}
        destructive
      >
        {stop.error && (
          <p role='alert' className='text-destructive text-sm'>
            {t(stop.error.message)}
          </p>
        )}
      </ConfirmDialog>
    </SideDrawerSection>
  )
}
