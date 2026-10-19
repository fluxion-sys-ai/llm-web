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
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SectionPageLayout } from '@/components/layout'
import { WalletPromotionsCard } from '@/features/customer-pricing/components/wallet-promotions-card'
import { useSystemConfig } from '@/hooks/use-system-config'
import { getSelf } from '@/lib/api'

import { BillingHistoryDialog } from './components/dialogs/billing-history-dialog'
import { PaymentConfirmDialog } from './components/dialogs/payment-confirm-dialog'
import { RechargeFormCard } from './components/recharge-form-card'
import { SubscriptionPlansCard } from './components/subscription-plans-card'
import { WalletStatsCard } from './components/wallet-stats-card'
import { DEFAULT_DISCOUNT_RATE, PAYMENT_TYPES } from './constants'
import { useTopupInfo, usePayment } from './hooks'
import { getStripePaymentMethod } from './lib'
import type { UserWalletData, PaymentMethod, PresetAmount } from './types'

interface WalletProps {
  initialShowHistory?: boolean
}

export function Wallet(props: WalletProps) {
  const { t } = useTranslation()
  const [user, setUser] = useState<UserWalletData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [topupAmount, setTopupAmount] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>()
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [billingDialogOpen, setBillingDialogOpen] = useState(false)
  const [showSubscriptionPanel, setShowSubscriptionPanel] = useState(true)

  const { currency } = useSystemConfig()
  const {
    topupInfo,
    presetAmounts,
    loading: topupLoading,
    error: topupError,
    refetch: refetchTopupInfo,
  } = useTopupInfo()
  const stripeMethod = useMemo(
    () => getStripePaymentMethod(topupInfo),
    [topupInfo]
  )

  // Calculate effective exchange rate - when display type is USD, use rate of 1
  const effectiveUsdExchangeRate = useMemo(() => {
    return currency?.quotaDisplayType === 'USD'
      ? 1
      : currency?.usdExchangeRate || 1
  }, [currency?.quotaDisplayType, currency?.usdExchangeRate])
  const {
    amount: paymentAmount,
    calculating,
    processing,
    calculatePaymentAmount,
    processPayment,
  } = usePayment()
  // Fetch and refresh user data
  const fetchUser = useCallback(async () => {
    try {
      setUserLoading(true)
      const response = await getSelf()
      if (response.success && response.data) {
        setUser(response.data as UserWalletData)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch user data:', error)
    } finally {
      setUserLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (props.initialShowHistory) {
      setBillingDialogOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [props.initialShowHistory])

  const topupAmountInitializedRef = useRef(false)
  useEffect(() => {
    if (stripeMethod && !topupAmountInitializedRef.current) {
      topupAmountInitializedRef.current = true
      const minTopup = stripeMethod.min_topup || 1
      setTopupAmount(minTopup)
      void calculatePaymentAmount(minTopup, PAYMENT_TYPES.STRIPE)
    }
  }, [stripeMethod, calculatePaymentAmount])

  const handleSelectPreset = (preset: PresetAmount) => {
    if (!stripeMethod || preset.value < (stripeMethod.min_topup || 1)) return
    setTopupAmount(preset.value)
    setSelectedPreset(preset.value)
    void calculatePaymentAmount(preset.value, PAYMENT_TYPES.STRIPE)
  }

  const handleTopupAmountChange = (amount: number) => {
    setTopupAmount(amount)
    setSelectedPreset(null)
    if (stripeMethod && amount >= (stripeMethod.min_topup || 1)) {
      void calculatePaymentAmount(amount, PAYMENT_TYPES.STRIPE)
    }
  }

  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    if (
      !stripeMethod ||
      method.type !== PAYMENT_TYPES.STRIPE ||
      topupAmount < (stripeMethod.min_topup || 1)
    ) {
      return
    }
    setSelectedPaymentMethod(stripeMethod)
    setPaymentLoading(PAYMENT_TYPES.STRIPE)
    try {
      const quote = await calculatePaymentAmount(
        topupAmount,
        PAYMENT_TYPES.STRIPE
      )
      if (!Number.isFinite(quote) || quote <= 0) {
        toast.error(t('Unable to calculate payment amount. Please try again.'))
        return
      }
      setConfirmDialogOpen(true)
    } finally {
      setPaymentLoading(null)
    }
  }

  const handlePaymentConfirm = async () => {
    if (
      !stripeMethod ||
      !selectedPaymentMethod ||
      calculating ||
      processing ||
      topupAmount < (stripeMethod.min_topup || 1) ||
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0
    ) {
      return
    }
    const success = await processPayment(topupAmount, PAYMENT_TYPES.STRIPE)
    if (success) {
      setConfirmDialogOpen(false)
      await fetchUser()
    }
  }

  // Get discount rate for current topup amount
  const getDiscountRate = useCallback(() => {
    return topupInfo?.discount?.[topupAmount] || DEFAULT_DISCOUNT_RATE
  }, [topupInfo, topupAmount])

  const handleSubscriptionAvailabilityChange = useCallback(
    (available: boolean) => {
      setShowSubscriptionPanel(available)
    },
    []
  )

  return (
    <>
      <SectionPageLayout>
        <SectionPageLayout.Title>{t('Wallet')}</SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <div className='mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6'>
            <WalletStatsCard user={user} loading={userLoading} />
            <WalletPromotionsCard />

            <div
              className={
                showSubscriptionPanel
                  ? 'grid items-start gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]'
                  : 'grid gap-5 sm:gap-6'
              }
            >
              <div id='wallet-add-funds' className='scroll-mt-4'>
                <RechargeFormCard
                  topupInfo={topupInfo}
                  presetAmounts={presetAmounts}
                  selectedPreset={selectedPreset}
                  onSelectPreset={handleSelectPreset}
                  topupAmount={topupAmount}
                  onTopupAmountChange={handleTopupAmountChange}
                  paymentAmount={paymentAmount}
                  calculating={calculating}
                  onPaymentMethodSelect={handlePaymentMethodSelect}
                  paymentLoading={paymentLoading}
                  loading={topupLoading}
                  error={topupError}
                  onRetry={refetchTopupInfo}
                  usdExchangeRate={effectiveUsdExchangeRate}
                  onOpenBilling={() => setBillingDialogOpen(true)}
                />
              </div>

              <SubscriptionPlansCard
                topupInfo={topupInfo}
                onAvailabilityChange={handleSubscriptionAvailabilityChange}
              />
            </div>
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <PaymentConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handlePaymentConfirm}
        topupAmount={topupAmount}
        paymentAmount={paymentAmount}
        paymentMethod={selectedPaymentMethod}
        calculating={calculating}
        processing={processing}
        discountRate={getDiscountRate()}
        usdExchangeRate={effectiveUsdExchangeRate}
      />

      <BillingHistoryDialog
        open={billingDialogOpen}
        onOpenChange={setBillingDialogOpen}
      />
    </>
  )
}
