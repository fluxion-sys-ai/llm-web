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
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { useSystemConfigStore } from '@/stores/system-config-store'

import type { PlanRecord } from '../../../types'
import { SubscriptionPurchaseDialog } from '../subscription-purchase-dialog'

const plan: PlanRecord = {
  plan: {
    id: 7,
    title: 'Developer plan',
    price_amount: 20,
    currency: 'USD',
    duration_unit: 'month',
    duration_value: 1,
    quota_reset_period: 'never',
    enabled: true,
    sort_order: 1,
    allow_balance_pay: true,
    allow_wallet_overflow: true,
    max_purchase_per_user: 2,
    total_amount: 1000000,
    stripe_price_id: 'price_test',
    creem_product_id: 'creem_test',
    waffo_pancake_product_id: 'waffo_test',
  },
}
const mixedPaymentProps = {
  enableStripe: true,
  enableCreem: true,
  enableOnlineTopUp: true,
  enableWaffoPancake: true,
  epayMethods: [{ name: 'Alipay', type: 'alipay' }],
  userQuota: 50000000,
}

beforeEach(() => {
  localStorage.clear()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  vi.spyOn(window, 'open').mockReturnValue(null)
})
afterEach(() => {
  cleanup()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  localStorage.clear()
})

test('subscription checkout offers only Stripe and preserves loading and failure without falling back to wallet balance', async () => {
  let resolvePayment!: (value: {
    data: { success: boolean; message: string }
  }) => void
  vi.spyOn(api, 'post').mockReturnValue(
    new Promise((resolve) => {
      resolvePayment = resolve
    })
  )
  const onOpenChange = vi.fn()
  const user = userEvent.setup()
  render(
    <SubscriptionPurchaseDialog
      {...mixedPaymentProps}
      open
      onOpenChange={onOpenChange}
      plan={plan}
    />
  )
  const checkout = screen.getByRole('button', { name: 'Continue with Stripe' })
  expect(
    screen.queryByRole('button', { name: /Creem|Waffo|Pay with Balance/ })
  ).not.toBeInTheDocument()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()

  await user.click(checkout)
  expect(checkout).toBeDisabled()
  expect(api.post).toHaveBeenCalledWith('/api/subscription/stripe/pay', {
    plan_id: 7,
  })
  await act(async () =>
    resolvePayment({
      data: { success: false, message: 'Checkout unavailable' },
    })
  )
  await waitFor(() => expect(checkout).toBeEnabled())
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(window.open).not.toHaveBeenCalled()
  expect(onOpenChange).not.toHaveBeenCalled()
})

test.each([false, true])(
  'subscriptions cannot purchase without enabled Stripe and a price ID (enabled=%s)',
  (enabled) => {
    const unavailablePlan = {
      plan: { ...plan.plan, stripe_price_id: enabled ? '' : 'price_test' },
    }
    render(
      <SubscriptionPurchaseDialog
        {...mixedPaymentProps}
        enableStripe={enabled}
        open
        onOpenChange={vi.fn()}
        plan={unavailablePlan}
      />
    )
    expect(
      screen.getByText('Stripe payments are currently unavailable.')
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Continue with Stripe' })
    ).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: /Creem|Waffo|Pay with Balance/ })
    ).not.toBeInTheDocument()
  }
)
