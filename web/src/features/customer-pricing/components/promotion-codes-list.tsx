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
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { getPromotionCodes, stopPromotion } from '../api'
import { usePromotionClock } from '../hooks/use-promotion-clock'
import { getPromotionStatus } from '../lib/promotion-status'
import type { Promotion } from '../types'
import { PromotionDetails } from './promotion-details'

const emptyPromotions: Promotion[] = []

export function PromotionCodesList(props: {
  userId?: number
  enabled: boolean
  canWrite: boolean
}) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const root = useAuthStore(
    (state) => state.auth.user?.role === ROLE.SUPER_ADMIN
  )
  const [page, setPage] = useState(1)
  const [action, setAction] = useState<{
    id: number
    type: 'disable' | 'revoke'
    public?: boolean
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
        queryKey: ['promotion-codes'],
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
                id: 'audience',
                header: t('Audience'),
                cell: (promotion) =>
                  promotion.audience === 'all_users'
                    ? t('All users')
                    : t('User #{{id}}', { id: promotion.user_id }),
              },
              {
                id: 'redemptions',
                header: t('Redemptions'),
                cell: (promotion) =>
                  promotion.redemption_count ??
                  (promotion.starts_at > 0 ? 1 : 0),
              },
              {
                id: 'action',
                header: t('Actions'),
                cell: (promotion) => {
                  if (!props.canWrite) return null
                  const status = getPromotionStatus(promotion, now)
                  if (promotion.audience === 'all_users') {
                    if (!root || status === 'revoked') return null
                    return (
                      <div className='flex flex-wrap gap-2'>
                        {status === 'available' && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setAction({
                                id: promotion.id,
                                type: 'disable',
                                public: true,
                              })
                            }
                          >
                            {t('Disable code')}
                          </Button>
                        )}
                        {(promotion.redemption_count ?? 0) > 0 && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setAction({
                                id: promotion.id,
                                type: 'revoke',
                                public: true,
                              })
                            }
                          >
                            {t('Revoke all benefits')}
                          </Button>
                        )}
                      </div>
                    )
                  }
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
                action.public
                  ? 'This code and all discounts already redeemed from it will stop immediately. Past charges will not change.'
                  : 'This discount will stop immediately. Past charges will not change.'
              )
            : t(
                action?.public
                  ? 'This code will no longer be redeemable. Discounts already redeemed remain active.'
                  : 'This code will no longer be redeemable.'
              )
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
