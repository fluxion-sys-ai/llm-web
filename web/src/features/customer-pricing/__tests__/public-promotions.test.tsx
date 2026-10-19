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
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { CustomerPricingPage } from '..'
import type { Promotion } from '../types'

let client: QueryClient
let campaigns: Promotion[]
const customer = { id: 42, username: 'customer-a', role: 1, status: 1 }
const publicCode: Promotion = {
  id: 9,
  user_id: 0,
  audience: 'all_users',
  redemption_count: 2,
  name: 'Public offer',
  multiplier: 0.8,
  duration_seconds: 14400,
  redeem_before: 0,
  starts_at: 0,
  expires_at: 0,
  created_at: 1,
  code_mask: 'promo_••••test',
  status: 'available',
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  campaigns = []
  useAuthStore.getState().auth.setUser({ id: 1, username: 'root', role: 100 })
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/customer-pricing/codes') {
      return {
        data: {
          success: true,
          data: {
            items: campaigns,
            total: campaigns.length,
            page: 1,
            page_size: 10,
          },
        },
      }
    }
    if (url.startsWith('/api/user/search?')) {
      return {
        data: {
          success: true,
          data: { items: [customer], total: 1, page: 1, page_size: 20 },
        },
      }
    }
    if (url === '/api/customer-pricing/users/42') {
      return {
        data: {
          success: true,
          data: {
            user_id: 42,
            promotion_codes_enabled: true,
            model_prices: [],
          },
        },
      }
    }
    if (url === '/api/customer-pricing/models') {
      return {
        data: {
          success: true,
          data: [{ model_name: 'GLM-5.3', billing_model_name: 'GLM-5.3' }],
        },
      }
    }
    throw new Error(`Unexpected request: ${url}`)
  })
})
afterEach(() => {
  cleanup()
  client.clear()
  vi.restoreAllMocks()
  useAuthStore.getState().auth.reset()
})
function renderPage() {
  return render(
    <QueryClientProvider client={client}>
      <CustomerPricingPage />
    </QueryClientProvider>
  )
}

function setAdmin(write = true) {
  useAuthStore.getState().auth.setUser({
    id: 2,
    username: 'admin',
    role: 10,
    permissions: {
      admin_permissions: { customer_pricing: { read: true, write } },
    },
  })
}

test('root can create a public code without first selecting a user', async () => {
  vi.spyOn(api, 'post').mockResolvedValue({
    data: {
      success: true,
      data: { code: 'public-created-once', promotion: publicCode },
    },
  })
  renderPage()
  expect(screen.getByRole('tab', { name: 'Promotion codes' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  expect(screen.getByRole('combobox', { name: 'Audience' })).toHaveValue(
    'all_users'
  )
  expect(
    screen.queryByRole('combobox', { name: 'User' })
  ).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Create code' }))
  expect(await screen.findByText('public-created-once')).toBeVisible()
  expect(api.post).toHaveBeenCalledWith('/api/customer-pricing/codes', {
    audience: 'all_users',
    user_id: 0,
    name: '',
    multiplier: 0.7,
    duration_seconds: 86400,
  })
  expect(api.get).toHaveBeenCalledWith('/api/customer-pricing/codes', {
    params: { p: 1, page_size: 10 },
  })
})

test('specific-user creation requires choosing a user from search results', async () => {
  vi.spyOn(api, 'post').mockResolvedValue({
    data: {
      success: true,
      data: {
        code: 'targeted-created-once',
        promotion: { ...publicCode, audience: 'specific_user', user_id: 42 },
      },
    },
  })
  renderPage()
  await userEvent.selectOptions(
    screen.getByRole('combobox', { name: 'Audience' }),
    'specific_user'
  )
  expect(screen.getByRole('button', { name: 'Create code' })).toBeDisabled()
  const selector = screen.getByRole('combobox', { name: 'User' })
  await userEvent.click(selector)
  await userEvent.click(
    await screen.findByRole('option', { name: 'customer-a · #42' })
  )
  await userEvent.click(screen.getByRole('button', { name: 'Create code' }))
  expect(await screen.findByText('targeted-created-once')).toBeVisible()
  expect(api.post).toHaveBeenCalledWith(
    '/api/customer-pricing/codes',
    expect.objectContaining({ audience: 'specific_user', user_id: 42 })
  )
})

test('ordinary admins see public campaigns but cannot create or stop them', async () => {
  setAdmin()
  campaigns = [publicCode]
  renderPage()
  expect(screen.getByRole('combobox', { name: 'Audience' })).toHaveValue(
    'specific_user'
  )
  expect(
    screen.queryByRole('option', { name: 'All users' })
  ).not.toBeInTheDocument()
  expect(await screen.findByText('Public offer')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Disable code' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Revoke all benefits' })
  ).not.toBeInTheDocument()
})

test('disabling a public code keeps existing grants and remains distinct from revoking all grants', async () => {
  campaigns = [publicCode]
  vi.spyOn(api, 'post').mockImplementation(async (url) => {
    campaigns = [
      {
        ...publicCode,
        status: url.endsWith('/disable') ? 'disabled' : 'revoked',
      },
    ]
    return { data: { success: true, data: campaigns[0] } }
  })
  renderPage()
  expect(
    await screen.findByRole('columnheader', { name: 'Redemptions' })
  ).toBeVisible()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Disable code' })
  )
  expect(
    screen.getByText(
      'This code will no longer be redeemable. Discounts already redeemed remain active.'
    )
  ).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Revoke all benefits' })
  )
  expect(
    screen.getByText(
      'This code and all discounts already redeemed from it will stop immediately. Past charges will not change.'
    )
  ).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      '/api/customer-pricing/codes/9/revoke'
    )
  )
})

test('customer pricing tab selects existing users and models, then saves the selected model', async () => {
  vi.spyOn(api, 'put').mockResolvedValue({
    data: {
      success: true,
      data: {
        user_id: 42,
        promotion_codes_enabled: false,
        model_prices: [{ model_name: 'GLM-5.3', multiplier: 0.7 }],
      },
    },
  })
  renderPage()
  await userEvent.click(screen.getByRole('tab', { name: 'Customer pricing' }))
  await userEvent.click(screen.getByRole('combobox', { name: 'User' }))
  await userEvent.click(
    await screen.findByRole('option', { name: 'customer-a · #42' })
  )
  const selector = await screen.findByRole('combobox', { name: 'Model name' })
  await waitFor(() => expect(selector).toBeEnabled())
  await userEvent.click(selector)
  await userEvent.click(await screen.findByRole('option', { name: 'GLM-5.3' }))
  await userEvent.click(screen.getByRole('button', { name: 'Save model rate' }))
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith(
      '/api/customer-pricing/users/42/models',
      { model_name: 'GLM-5.3', multiplier: 0.7 }
    )
  )
  await waitFor(() =>
    expect(
      screen.getByRole('switch', { name: 'Allow promotion code discounts' })
    ).not.toBeChecked()
  )
})

test('read-only admins can review campaigns without creation or destructive actions', async () => {
  setAdmin(false)
  campaigns = [publicCode]
  renderPage()
  expect(await screen.findByText('Public offer')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Create code' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Disable code' })
  ).not.toBeInTheDocument()
})

test('ordinary users do not render administrator pricing controls or fetch pricing data', () => {
  useAuthStore.getState().auth.setUser({ id: 3, username: 'user', role: 1 })
  renderPage()
  expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  expect(api.get).not.toHaveBeenCalled()
})
