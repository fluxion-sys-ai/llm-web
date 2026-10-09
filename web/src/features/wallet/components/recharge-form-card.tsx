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
import { Gift, Loader2, Receipt, WalletCards } from 'lucide-react'
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
  redemptionCode: string
  onRedemptionCodeChange: (code: string) => void
  onRedeem: () => void
  redeeming: boolean
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
  redemptionCode,
  onRedemptionCodeChange,
  onRedeem,
  redeeming,
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
  const redemptionEnabled = !!topupInfo && topupInfo.enable_redemption !== false

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
            className='gap-2'
          >
            <Receipt className='h-4 w-4' />
            {t('Order History')}
          </Button>
        ) : null
      }
      contentClassName='space-y-5'
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
        <div className='space-y-5'>
          {presetAmounts.length > 0 && (
            <div className='space-y-2.5'>
              <Label className='text-sm'>{t('Amount')}</Label>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4'>
                {presetAmounts.map((preset) => {
                  const discount =
                    preset.discount || topupInfo?.discount?.[preset.value] || 1
                  const displayValue = preset.value * usdExchangeRate
                  const hasDiscount = discount > 0 && discount < 1
                  return (
                    <Button
                      key={preset.value}
                      variant='outline'
                      className={cn(
                        'h-auto min-h-20 flex-col items-start gap-1 rounded-xl px-3 py-3 text-left whitespace-normal',
                        selectedPreset === preset.value &&
                          'border-foreground bg-muted'
                      )}
                      disabled={preset.value < minTopup || !!paymentLoading}
                      onClick={() => onSelectPreset(preset)}
                    >
                      <span className='flex w-full items-center justify-between gap-2'>
                        <span className='text-base font-semibold tabular-nums'>
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
                      <span className='text-muted-foreground text-xs'>
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
              className='h-10'
            />
            <p className='text-muted-foreground text-xs'>
              {t('Minimum topup amount: {{amount}}', { amount: minTopup })}
            </p>
          </div>
          <div className='bg-muted/40 flex items-center justify-between rounded-xl border px-4 py-3'>
            <span className='text-muted-foreground text-sm'>
              {t('Amount to pay:')}
            </span>
            {calculating ? (
              <Skeleton className='h-5 w-16' />
            ) : (
              <output
                aria-label={t('Amount to pay:')}
                className='text-base font-semibold tabular-nums'
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
            className='h-10 w-full'
            disabled={!validAmount || calculating || !!paymentLoading}
            onClick={() => onPaymentMethodSelect(stripeMethod)}
          >
            {paymentLoading && <Loader2 className='size-4 animate-spin' />}
            {t('Continue with Stripe')}
          </Button>
        </div>
      )}
      {!loading && !error && !stripeMethod && (
        <Alert>
          <AlertDescription>
            {t('Stripe payments are currently unavailable.')}
          </AlertDescription>
        </Alert>
      )}

      {!loading && !error && redemptionEnabled && (
        <div className='space-y-3 border-t pt-5'>
          <Label htmlFor='redemption-code' className='flex items-center gap-2'>
            <Gift className='text-muted-foreground size-4' />
            {t('Redemption Code')}
          </Label>
          <div className='flex gap-2'>
            <Input
              id='redemption-code'
              value={redemptionCode}
              onChange={(event) => onRedemptionCodeChange(event.target.value)}
              placeholder={t('Enter redemption code')}
              disabled={redeeming}
              className='min-w-0 flex-1'
            />
            <Button
              variant='outline'
              onClick={onRedeem}
              disabled={redeeming || !redemptionCode.trim()}
            >
              {redeeming && <Loader2 className='size-4 animate-spin' />}
              {t('Redeem')}
            </Button>
          </div>
        </div>
      )}
    </TitledCard>
  )
}
