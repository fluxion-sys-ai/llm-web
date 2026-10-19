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
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { PromotionDetails } from '../components/promotion-details'
import { WalletPromotionsCard } from '../components/wallet-promotions-card'
import { usePromotionClock } from '../hooks/use-promotion-clock'
import type { CustomerBenefits, Promotion } from '../types'

let client: QueryClient
let benefits: CustomerBenefits
const active: Promotion = {
  id: 1,
  user_id: 42,
  name: 'Welcome offer',
  multiplier: 0.7,
  duration_seconds: 86400,
  starts_at: 1,
  expires_at: 4_000_000_000,
  redeem_before: 0,
  created_at: 1,
  code_mask: '',
  status: 'active',
}
beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  benefits = {
    user_id: 42,
    promotion_codes_enabled: true,
    model_prices: [],
    promotions: [],
  }
  vi.spyOn(api, 'get').mockImplementation(async () => ({
    data: { success: true, data: benefits },
  }))
})
afterEach(() => {
  cleanup()
  client.clear()
  vi.restoreAllMocks()
  vi.useRealTimers()
})
function renderWallet() {
  return render(
    <QueryClientProvider client={client}>
      <WalletPromotionsCard />
    </QueryClientProvider>
  )
}

test('redeeming a promotion sends the separate endpoint and displays the all-model benefit with expiry', async () => {
  vi.spyOn(api, 'post').mockImplementation(async () => {
    benefits = { ...benefits, promotions: [active] }
    return { data: { success: true, data: active } }
  })
  renderWallet()
  await userEvent.type(
    await screen.findByRole('textbox', { name: 'Promotion code' }),
    '  promo_test  '
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Redeem promotion code' })
  )
  expect(await screen.findByText('30% off all models')).toBeVisible()
  expect(screen.getByText(/Expires:/)).toBeVisible()
  expect(screen.getByText('Active')).toBeVisible()
  expect(api.post).toHaveBeenCalledWith('/api/user/self/promotions/redeem', {
    code: 'promo_test',
  })
  expect(screen.getByRole('textbox', { name: 'Promotion code' })).toHaveValue(
    ''
  )
})

test('blocked promotion discounts disable redemption but retain expiry and custom rate visibility', async () => {
  benefits = {
    ...benefits,
    promotion_codes_enabled: false,
    promotions: [active],
    model_prices: [{ model_name: 'gpt-5', multiplier: 0.7 }],
  }
  renderWallet()
  expect(
    await screen.findByRole('button', { name: 'Redeem promotion code' })
  ).toBeDisabled()
  expect(screen.getByRole('textbox', { name: 'Promotion code' })).toBeDisabled()
  expect(screen.getByText('Discounts paused')).toBeVisible()
  expect(screen.getByText(/Expires:/)).toBeVisible()
  expect(screen.getByText('0.7× normal fee')).toBeVisible()
})

test('failed redemption shows the server reason and preserves the code for correction', async () => {
  vi.spyOn(api, 'post').mockResolvedValue({
    data: { success: false, message: 'This code belongs to another user' },
  })
  renderWallet()
  await userEvent.type(
    await screen.findByRole('textbox', { name: 'Promotion code' }),
    'other-user-code'
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Redeem promotion code' })
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'This code belongs to another user'
  )
  expect(screen.getByRole('textbox', { name: 'Promotion code' })).toHaveValue(
    'other-user-code'
  )
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Redeem promotion code' })
    ).toBeEnabled()
  )
})

test('a benefit switches from active to expired when its redemption period ends without a page reload', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-19T12:00:00Z'))
  const promotion = { ...active, expires_at: Date.now() / 1000 + 2 }
  function Clock() {
    const now = usePromotionClock([promotion])
    return <PromotionDetails promotion={promotion} now={now} enabled />
  }
  render(<Clock />)
  expect(screen.getByText('Active')).toBeVisible()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2025)
  })
  expect(screen.getByText('Expired')).toBeVisible()
  expect(screen.queryByText('Active')).not.toBeInTheDocument()
})

test('an HTTP rejection displays the server reason and keeps the promotion code available for correction', async () => {
  const error = new AxiosError(
    'Request failed with status code 409',
    'ERR_BAD_REQUEST'
  )
  error.response = {
    data: {
      success: false,
      message: 'promotion code is unavailable for this account',
    },
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  vi.spyOn(api, 'post').mockRejectedValue(error)
  renderWallet()
  await userEvent.type(
    await screen.findByRole('textbox', { name: 'Promotion code' }),
    'unavailable-code'
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Redeem promotion code' })
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'promotion code is unavailable for this account'
  )
  expect(screen.getByRole('textbox', { name: 'Promotion code' })).toHaveValue(
    'unavailable-code'
  )
})
