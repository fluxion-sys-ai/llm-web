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
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TicketPercent } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { TitledCard } from '@/components/ui/titled-card'

import { getSelfBenefits, redeemPromotion } from '../api'
import { usePromotionClock } from '../hooks/use-promotion-clock'
import { redeemPromotionSchema, type RedeemPromotionForm } from '../lib/forms'
import type { Promotion } from '../types'
import { PromotionDetails } from './promotion-details'

const emptyPromotions: Promotion[] = []

export function WalletPromotionsCard() {
  const { t } = useTranslation()
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['customer-benefits'],
    queryFn: getSelfBenefits,
  })
  const form = useForm<RedeemPromotionForm>({
    resolver: zodResolver(redeemPromotionSchema),
    defaultValues: { code: '' },
  })
  const redeem = useMutation({
    mutationFn: (values: RedeemPromotionForm) => redeemPromotion(values.code),
    onSuccess: async () => {
      form.reset()
      toast.success(t('Promotion code redeemed'))
      await client.invalidateQueries({ queryKey: ['customer-benefits'] })
    },
  })
  const promotions = query.data?.promotions ?? emptyPromotions
  const now = usePromotionClock(promotions)
  return (
    <TitledCard
      title={t('Model discounts')}
      description={t(
        'Redeem a promotion code for lower model usage fees. Promotion codes do not add wallet credit.'
      )}
      icon={<TicketPercent className='size-4' />}
      iconTone='neutral'
      disableHoverEffect
      contentClassName='space-y-5 p-5 sm:p-6'
    >
      {query.isPending && <LoadingState />}
      {query.isError && (
        <ErrorState
          title={t('Unable to load model discounts')}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && (
        <>
          {!query.data.promotion_codes_enabled && (
            <Alert>
              <AlertDescription>
                {t(
                  'Promotion code discounts are disabled for your account. Existing benefits keep their original expiry, but their discounts do not apply.'
                )}
              </AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => redeem.mutate(values))}
              className='space-y-3'
            >
              <div className='flex flex-col items-start gap-3 sm:flex-row sm:items-end'>
                <FormField
                  control={form.control}
                  name='code'
                  render={({ field }) => (
                    <FormItem className='w-full sm:flex-1'>
                      <FormLabel>{t('Promotion code')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoComplete='off'
                          disabled={
                            !query.data.promotion_codes_enabled ||
                            redeem.isPending
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type='submit'
                  disabled={
                    !query.data.promotion_codes_enabled || redeem.isPending
                  }
                >
                  {t('Redeem promotion code')}
                </Button>
              </div>
              {redeem.error && (
                <p role='alert' className='text-destructive text-sm'>
                  {t(redeem.error.message)}
                </p>
              )}
            </form>
          </Form>
          <p className='text-muted-foreground text-xs leading-relaxed'>
            {t(
              'Only the strongest active promotion applies, including to custom model rates when promotion discounts are allowed.'
            )}
          </p>
          {promotions.length === 0 ? (
            <p className='text-muted-foreground text-sm'>
              {t('No promotion benefits yet')}
            </p>
          ) : (
            <ul className='grid gap-3 sm:grid-cols-2'>
              {promotions.map((promotion) => (
                <li className='rounded-xl border p-4' key={promotion.id}>
                  <PromotionDetails
                    promotion={promotion}
                    now={now}
                    enabled={query.data.promotion_codes_enabled}
                  />
                </li>
              ))}
            </ul>
          )}
          {query.data.model_prices.length > 0 && (
            <section className='space-y-3 border-t pt-4'>
              <h3 className='text-sm font-medium'>
                {t('Your custom model rates')}
              </h3>
              <ul className='divide-y'>
                {query.data.model_prices.map((price) => (
                  <li
                    key={price.model_name}
                    className='flex flex-wrap justify-between gap-2 py-2 text-sm'
                  >
                    <span className='min-w-0 font-mono break-all'>
                      {price.model_name}
                    </span>
                    <span>
                      {t('{{multiplier}}× normal fee', {
                        multiplier: price.multiplier,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </TitledCard>
  )
}
