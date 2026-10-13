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
import { Loader2, Receipt, WalletCards } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import { formatLocalCurrencyAmount } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { getDiscountLabel, getStripePaymentMethod } from '../lib'
import type { PaymentMethod, PresetAmount, TopupInfo } from '../types'

interface RechargeFormCardProps {
  topupInfo: TopupInfo | null
  presetAmounts: PresetAmount[]
  selectedPreset: number | null
  onSelectPreset: (preset: PresetAmount) => void
  topupAmount: number
  onTopupAmountChange: (amount: number) => void
  paymentAmount: number
  calculating: boolean
  onPaymentMethodSelect: (method: PaymentMethod) => void
  paymentLoading: string | null
  loading?: boolean
  error?: Error | null
  onRetry?: () => void
  usdExchangeRate?: number
  onOpenBilling?: () => void
}

export function RechargeFormCard({
  topupInfo,
  presetAmounts,
  selectedPreset,
  onSelectPreset,
  topupAmount,
  onTopupAmountChange,
  paymentAmount,
  calculating,
  onPaymentMethodSelect,
  paymentLoading,
  loading,
  error,
  onRetry,
  usdExchangeRate = 1,
  onOpenBilling,
}: RechargeFormCardProps) {
  const { t } = useTranslation()
  const [localAmount, setLocalAmount] = useState(topupAmount.toString())
  useEffect(() => {
    setLocalAmount((previous) =>
      previous === '' && topupAmount === 0 ? previous : topupAmount.toString()
    )
  }, [topupAmount])

  const stripeMethod = getStripePaymentMethod(topupInfo)
  const minTopup = stripeMethod?.min_topup || 1
  const validAmount = Number.isFinite(topupAmount) && topupAmount >= minTopup

  return (
    <TitledCard
      title={t('Add Funds')}
      description={t('Add credits to your account with Stripe.')}
      icon={<WalletCards className='h-4 w-4' />}
      iconTone='neutral'
      disableHoverEffect
      action={
        onOpenBilling ? (
          <Button
            variant='outline'
            size='sm'
            onClick={onOpenBilling}
            className='w-full gap-2 sm:w-auto'
          >
            <Receipt className='h-4 w-4' />
            {t('Order History')}
          </Button>
        ) : null
      }
      headerClassName='p-5 !pb-5 sm:px-6 sm:py-5 sm:!pb-5'
      descriptionClassName='mt-1 leading-relaxed'
      contentClassName='@container/recharge space-y-6 p-5 sm:p-6'
    >
      {loading && (
        <div className='space-y-4' aria-busy='true'>
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4'>
            {['small', 'medium', 'large', 'extra-large'].map((key) => (
              <Skeleton key={key} className='h-20 rounded-xl' />
            ))}
          </div>
          <Skeleton className='h-10 w-full rounded-lg' />
          <Skeleton className='h-10 w-full rounded-lg' />
        </div>
      )}
      {!loading && error && (
        <ErrorState
          title={t('Unable to load payment options')}
          onRetry={onRetry}
          className='min-h-[180px]'
        />
      )}
      {!loading && !error && stripeMethod && (
        <div className='grid items-start gap-6 @3xl/recharge:grid-cols-[minmax(0,1fr)_260px]'>
          <div className='min-w-0 space-y-6'>
            {presetAmounts.length > 0 && (
              <div className='space-y-2.5'>
                <Label className='text-sm'>{t('Amount')}</Label>
                <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4'>
                  {presetAmounts.map((preset) => {
                    const discount =
                      preset.discount ||
                      topupInfo?.discount?.[preset.value] ||
                      1
                    const displayValue = preset.value * usdExchangeRate
                    const hasDiscount = discount > 0 && discount < 1
                    return (
                      <Button
                        key={preset.value}
                        variant='outline'
                        className={cn(
                          'h-auto min-h-[88px] flex-col items-start gap-2 rounded-xl px-4 py-3.5 text-left whitespace-normal shadow-none',
                          selectedPreset === preset.value &&
                            'border-foreground bg-muted/50'
                        )}
                        disabled={preset.value < minTopup || !!paymentLoading}
                        onClick={() => onSelectPreset(preset)}
                      >
                        <span className='flex w-full items-center justify-between gap-2'>
                          <span className='font-sans text-xl font-semibold tracking-tight break-all tabular-nums'>
                            {formatLocalCurrencyAmount(displayValue, {
                              abbreviate: false,
                            })}
                          </span>
                          {hasDiscount && (
                            <span className='text-muted-foreground text-xs'>
                              {getDiscountLabel(discount)}
                            </span>
                          )}
                        </span>
                        <span className='text-muted-foreground text-[11px] font-normal'>
                          {t('Topup Amount')}
                        </span>
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className='space-y-2.5'>
              <div className='flex items-center justify-between gap-3'>
                <Label htmlFor='topup-amount'>{t('Custom Amount')}</Label>
                <span className='text-muted-foreground text-sm tabular-nums'>
                  {formatLocalCurrencyAmount(topupAmount * usdExchangeRate, {
                    abbreviate: false,
                  })}
                </span>
              </div>
              <Input
                id='topup-amount'
                type='number'
                min={minTopup}
                step={1}
                value={localAmount}
                disabled={!!paymentLoading}
                onChange={(event) => {
                  const value = event.target.value
                  setLocalAmount(value)
                  const amount = Number.parseInt(value) || 0
                  onTopupAmountChange(Math.max(0, amount))
                }}
                className='bg-background h-11 rounded-lg font-sans text-base tabular-nums'
              />
              <p className='text-muted-foreground text-xs'>
                {t('Minimum topup amount: {{amount}}', { amount: minTopup })}
              </p>
            </div>
          </div>
          <div className='bg-muted/30 flex min-w-0 flex-col rounded-xl border p-5'>
            <div className='flex items-center justify-between gap-4 @3xl/recharge:flex-col @3xl/recharge:items-start @3xl/recharge:gap-3'>
              <span className='text-muted-foreground text-sm'>
                {t('Amount to pay:')}
              </span>
              {calculating ? (
                <Skeleton className='h-9 w-24' />
              ) : (
                <output
                  aria-label={t('Amount to pay:')}
                  className='font-sans text-3xl font-semibold tracking-tight break-all tabular-nums'
                >
                  {validAmount && paymentAmount > 0
                    ? formatLocalCurrencyAmount(paymentAmount, {
                        abbreviate: false,
                      })
                    : '—'}
                </output>
              )}
            </div>
            <Button
              className='mt-5 h-11 w-full rounded-lg'
              disabled={!validAmount || calculating || !!paymentLoading}
              onClick={() => onPaymentMethodSelect(stripeMethod)}
            >
              {paymentLoading && <Loader2 className='size-4 animate-spin' />}
              {t('Continue with Stripe')}
            </Button>
          </div>
        </div>
      )}
      {!loading && !error && !stripeMethod && (
        <Alert>
          <AlertDescription>
            {t('Stripe payments are currently unavailable.')}
          </AlertDescription>
        </Alert>
      )}
    </TitledCard>
  )
}
