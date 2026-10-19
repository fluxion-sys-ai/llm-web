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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createRootRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { Wallet } from '..'
import type { TopupInfo } from '../types'

let client: QueryClient
let topupInfo: TopupInfo
let failInfo: boolean
let failQuote: boolean

beforeEach(() => {
  localStorage.clear()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  client.setQueryData(['status'], { price: 1 })
  failInfo = false
  failQuote = false
  topupInfo = {
    enable_online_topup: true,
    enable_stripe_topup: true,
    enable_creem_topup: true,
    enable_waffo_topup: true,
    enable_waffo_pancake_topup: true,
    payment_compliance_confirmed: true,
    enable_redemption: true,
    pay_methods: [
      { name: 'Alipay', type: 'alipay' },
      { name: 'Stripe', type: 'stripe', min_topup: 20 },
    ],
    min_topup: 1,
    stripe_min_topup: 20,
    amount_options: [10, 20, 50],
    discount: {},
    topup_link: 'https://other-checkout.example/codes',
    creem_products: [
      {
        name: 'Creem credits',
        productId: 'creem-credit',
        price: 10,
        quota: 10,
        currency: 'USD',
      },
    ],
    waffo_pay_methods: [{ name: 'Waffo bank' }],
  }
  vi.spyOn(window, 'open').mockReturnValue(null)
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/user/self/promotions') {
      return {
        data: {
          success: true,
          data: {
            user_id: 1,
            promotion_codes_enabled: true,
            model_prices: [],
            promotions: [],
          },
        },
      }
    }
    if (url === '/api/user/topup/info') {
      if (failInfo) throw new Error('Payment configuration unavailable')
      return { data: { success: true, data: topupInfo } }
    }
    if (String(url).startsWith('/api/user/topup/self?')) {
      return { data: { success: true, data: { items: [], total: 0 } } }
    }
    if (url === '/api/user/self') {
      return {
        data: {
          success: true,
          data: {
            id: 1,
            quota: 10000000,
            used_quota: 0,
            request_count: 0,
            aff_quota: 0,
          },
        },
      }
    }
    if (url === '/api/user/aff') {
      return { data: { success: true, data: 'invite-code' } }
    }
    if (url === '/api/subscription/plans') {
      return { data: { success: true, data: [] } }
    }
    if (url === '/api/subscription/self') {
      return {
        data: {
          success: true,
          data: { subscriptions: [], all_subscriptions: [] },
        },
      }
    }
    throw new Error(`Unexpected GET ${url}`)
  })
  vi.spyOn(api, 'post').mockImplementation(async (url) => {
    if (String(url).endsWith('/amount')) {
      return {
        data: failQuote
          ? { success: false, message: 'Quote unavailable' }
          : { success: true, data: '20' },
      }
    }
    if (url === '/api/user/stripe/pay') {
      return {
        data: {
          success: true,
          data: { pay_link: 'https://checkout.stripe.com/test-only' },
        },
      }
    }
    throw new Error(`Unexpected POST ${url}`)
  })
})

afterEach(() => {
  cleanup()
  client.clear()
  localStorage.clear()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
})

async function renderWallet() {
  const router = createRouter({
    routeTree: createRootRoute({ component: Wallet }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

test('mixed backend providers expose only Stripe checkout and use its minimum and quote endpoint', async () => {
  const user = userEvent.setup()
  await renderWallet()
  const checkout = await screen.findByRole('button', {
    name: 'Continue with Stripe',
  })
  await waitFor(() => expect(checkout).toBeEnabled())
  expect(screen.getByRole('spinbutton', { name: 'Custom Amount' })).toHaveValue(
    20
  )
  expect(
    screen.queryByRole('button', { name: /Alipay|Creem|Waffo/ })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Get one here' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Redeem' })
  ).not.toBeInTheDocument()
  expect(api.post).toHaveBeenCalledWith(
    '/api/user/stripe/amount',
    { amount: 20 },
    expect.anything()
  )
  expect(
    vi
      .mocked(api.post)
      .mock.calls.every(([url]) => url === '/api/user/stripe/amount')
  ).toBe(true)

  await user.click(checkout)
  await user.click(
    await screen.findByRole('button', { name: 'Confirm Payment' })
  )
  await waitFor(() =>
    expect(window.open).toHaveBeenCalledWith(
      'https://checkout.stripe.com/test-only',
      '_blank'
    )
  )
  expect(api.post).toHaveBeenCalledWith(
    '/api/user/stripe/pay',
    { amount: 20, payment_method: 'stripe' },
    expect.anything()
  )
})

test('wallet keeps balance redemption and referrals hidden while model promotions remain separate', async () => {
  await renderWallet()
  expect(
    await screen.findByRole('button', { name: 'Continue with Stripe' })
  ).toBeVisible()
  expect(screen.queryByLabelText('Redemption Code')).not.toBeInTheDocument()
  expect(screen.queryByText('Referral Program')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Copy referral link' })
  ).not.toBeInTheDocument()
  expect(
    vi.mocked(api.get).mock.calls.some(([url]) => url === '/api/user/aff')
  ).toBe(false)
})

test.each(['disabled', 'unconfirmed'])(
  'unavailable Stripe (%s) does not offer other gateways or code redemption',
  async (reason) => {
    if (reason === 'disabled') topupInfo.enable_stripe_topup = false
    else topupInfo.payment_compliance_confirmed = false
    await renderWallet()
    expect(
      await screen.findByText('Stripe payments are currently unavailable.')
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Continue with Stripe' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Alipay|Creem|Waffo/ })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Redeem' })
    ).not.toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  }
)

test('a failed configuration load shows a retry action without offering checkout', async () => {
  failInfo = true
  const user = userEvent.setup()
  await renderWallet()
  expect(
    await screen.findByText('Unable to load payment options')
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Continue with Stripe' })
  ).not.toBeInTheDocument()
  failInfo = false
  await user.click(screen.getByRole('button', { name: 'Retry' }))
  expect(
    await screen.findByRole('button', { name: 'Continue with Stripe' })
  ).toBeVisible()
})

test('a failed Stripe quote never opens confirmation or initiates payment', async () => {
  failQuote = true
  const user = userEvent.setup()
  await renderWallet()
  const checkout = await screen.findByRole('button', {
    name: 'Continue with Stripe',
  })
  await waitFor(() => expect(checkout).toBeEnabled())
  await user.click(checkout)
  await waitFor(() => expect(checkout).toBeEnabled())
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(
    vi
      .mocked(api.post)
      .mock.calls.every(([url]) => url === '/api/user/stripe/amount')
  ).toBe(true)
  expect(window.open).not.toHaveBeenCalled()
})

test('an amount below the Stripe minimum cannot request a quote or begin checkout', async () => {
  const user = userEvent.setup()
  await renderWallet()
  const checkout = await screen.findByRole('button', {
    name: 'Continue with Stripe',
  })
  await waitFor(() => expect(checkout).toBeEnabled())
  const callsBefore = vi.mocked(api.post).mock.calls.length
  const input = screen.getByRole('spinbutton', { name: 'Custom Amount' })
  await user.clear(input)
  await user.type(input, '10')
  expect(checkout).toBeDisabled()
  expect(api.post).toHaveBeenCalledTimes(callsBefore)
  expect(window.open).not.toHaveBeenCalled()
})

test('Stripe checkout failure keeps confirmation open for retry', async () => {
  vi.mocked(api.post).mockImplementation(async (url) => ({
    data: String(url).endsWith('/amount')
      ? { success: true, data: '20' }
      : { success: false, message: 'Checkout unavailable' },
  }))
  const user = userEvent.setup()
  await renderWallet()
  const checkout = await screen.findByRole('button', {
    name: 'Continue with Stripe',
  })
  await waitFor(() => expect(checkout).toBeEnabled())
  await user.click(checkout)
  const confirm = await screen.findByRole('button', { name: 'Confirm Payment' })
  await user.click(confirm)
  await waitFor(() => expect(confirm).toBeEnabled())
  expect(screen.getByRole('alertdialog')).toBeVisible()
  expect(api.post).toHaveBeenCalledWith(
    '/api/user/stripe/pay',
    { amount: 20, payment_method: 'stripe' },
    expect.anything()
  )
  expect(window.open).not.toHaveBeenCalled()
})

test('wallet shows configured currency while keeping the quoted and submitted amount in their original units', async () => {
  const store = useSystemConfigStore.getState()
  store.setConfig({
    currency: {
      ...store.config.currency,
      quotaDisplayType: 'CNY',
      usdExchangeRate: 7,
    },
  })
  await renderWallet()
  const checkout = await screen.findByRole('button', {
    name: 'Continue with Stripe',
  })
  await waitFor(() => expect(checkout).toBeEnabled())
  expect(screen.getByRole('spinbutton', { name: 'Custom Amount' })).toHaveValue(
    20
  )
  expect(screen.getByLabelText('Amount to pay:')).toHaveTextContent('¥20')
  expect(
    screen.getByRole('button', { name: /¥140\s*Topup Amount/ })
  ).toBeVisible()
  expect(api.post).toHaveBeenCalledWith(
    '/api/user/stripe/amount',
    { amount: 20 },
    expect.anything()
  )
})
