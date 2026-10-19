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
import type { Row } from '@tanstack/react-table'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { DataTableRowActions } from '@/features/users/components/data-table-row-actions'
import { UsersProvider } from '@/features/users/components/users-provider'
import type { User } from '@/features/users/types'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { CustomerPricingDrawer } from '../components/customer-pricing-drawer'
import type { CustomerPricing, ModelPrice, Promotion } from '../types'

let client: QueryClient
let pricing: CustomerPricing
let promotions: Promotion[]
const target = { id: 42, username: 'customer', role: 1, status: 1 } as User
const available: Promotion = {
  id: 5,
  user_id: 42,
  name: 'Launch',
  multiplier: 0.7,
  duration_seconds: 86400,
  redeem_before: 0,
  starts_at: 0,
  expires_at: 0,
  created_at: 1,
  code_mask: 'promo_••••abcd',
  status: 'available',
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  pricing = { user_id: 42, promotion_codes_enabled: true, model_prices: [] }
  promotions = []
  useAuthStore.getState().auth.setUser({ id: 1, username: 'root', role: 100 })
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/customer-pricing/models') {
      return {
        data: {
          success: true,
          data: [
            { model_name: 'gpt-5', billing_model_name: 'gpt-5' },
            { model_name: 'GLM-5.3', billing_model_name: 'GLM-5.3' },
          ],
        },
      }
    }
    if (url === '/api/customer-pricing/users/42') {
      return { data: { success: true, data: pricing } }
    }
    if (url === '/api/customer-pricing/codes') {
      return {
        data: {
          success: true,
          data: {
            items: promotions,
            total: promotions.length,
            page: 1,
            page_size: 10,
          },
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

function renderDrawer() {
  return render(
    <QueryClientProvider client={client}>
      <CustomerPricingDrawer
        user={target}
        open
        onOpenChange={() => undefined}
      />
    </QueryClientProvider>
  )
}

test.each([
  { role: 100, read: false, targetRole: 100, visible: true },
  { role: 10, read: true, targetRole: 1, visible: true },
  { role: 10, read: true, targetRole: 10, visible: false },
  { role: 10, read: true, targetRole: 100, visible: false },
  { role: 10, read: false, targetRole: 1, visible: false },
  { role: 1, read: true, targetRole: 1, visible: false },
])(
  'pricing menu visibility respects role and permission: %j',
  async (viewer) => {
    useAuthStore.getState().auth.setUser({
      id: 1,
      username: 'viewer',
      role: viewer.role,
      permissions: {
        admin_permissions: {
          customer_pricing: { read: viewer.read, write: true },
        },
      },
    })
    render(
      <QueryClientProvider client={client}>
        <UsersProvider>
          <DataTableRowActions
            row={
              { original: { ...target, role: viewer.targetRole } } as Row<User>
            }
          />
        </UsersProvider>
      </QueryClientProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(
      screen.queryByRole('menuitem', { name: 'Pricing & promotions' }) !== null
    ).toBe(viewer.visible)
    expect(api.get).not.toHaveBeenCalled()
  }
)

test('each model rate save disables user-wide promotions, including after explicit re-enable', async () => {
  vi.spyOn(api, 'put').mockImplementation(async (_url, payload) => {
    pricing = {
      ...pricing,
      promotion_codes_enabled: false,
      model_prices: [payload as ModelPrice],
    }
    return { data: { success: true, data: pricing } }
  })
  vi.spyOn(api, 'patch').mockImplementation(async (_url, payload) => {
    pricing = {
      ...pricing,
      promotion_codes_enabled: (payload as { enabled: boolean }).enabled,
    }
    return { data: { success: true, data: pricing } }
  })
  renderDrawer()
  const toggle = await screen.findByRole('switch', {
    name: 'Allow promotion code discounts',
  })
  expect(toggle).toBeChecked()
  const model = screen.getByRole('combobox', { name: 'Model name' })
  await waitFor(() => expect(model).toBeEnabled())
  await userEvent.click(model)
  await userEvent.type(model, 'gpt-5')
  await userEvent.click(await screen.findByRole('option', { name: 'gpt-5' }))
  await userEvent.click(screen.getByRole('button', { name: 'Save model rate' }))
  await waitFor(() => expect(toggle).not.toBeChecked())
  expect(api.put).toHaveBeenLastCalledWith(
    '/api/customer-pricing/users/42/models',
    { model_name: 'gpt-5', multiplier: 0.7 }
  )
  await userEvent.click(toggle)
  await waitFor(() => expect(toggle).toBeChecked())
  expect(api.patch).toHaveBeenLastCalledWith(
    '/api/customer-pricing/users/42/promotion',
    { enabled: true }
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Edit rate for gpt-5' })
  )
  await userEvent.click(screen.getByRole('button', { name: 'Save model rate' }))
  await waitFor(() => expect(toggle).not.toBeChecked())
})

test('read-only pricing permission shows existing rates without editable controls', async () => {
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'reader',
    role: 10,
    permissions: {
      admin_permissions: { customer_pricing: { read: true, write: false } },
    },
  })
  pricing.model_prices = [{ model_name: 'gpt-5', multiplier: 0.7 }]
  renderDrawer()
  expect(
    await screen.findByRole('switch', {
      name: 'Allow promotion code discounts',
    })
  ).toHaveAttribute('aria-disabled', 'true')
  expect(screen.getByText('gpt-5')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Save model rate' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Create code' })
  ).not.toBeInTheDocument()
})

test('code creation converts percent off into a multiplier and only reveals the code once', async () => {
  vi.spyOn(api, 'post').mockResolvedValue({
    data: {
      success: true,
      data: { code: 'promo_test_secret', promotion: available },
    },
  })
  const view = renderDrawer()
  await screen.findByRole('button', { name: 'Create code' })
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Name (optional)' }),
    'Launch'
  )
  await userEvent.selectOptions(
    screen.getByRole('combobox', { name: 'Duration after redemption' }),
    '14400'
  )
  await userEvent.click(screen.getByRole('button', { name: 'Create code' }))
  expect(await screen.findByText('promo_test_secret')).toBeVisible()
  expect(api.post).toHaveBeenCalledWith('/api/customer-pricing/codes', {
    audience: 'specific_user',
    user_id: 42,
    name: 'Launch',
    multiplier: 0.7,
    duration_seconds: 14400,
  })
  expect(
    screen.getByRole('button', { name: 'Copy promotion code' })
  ).toBeVisible()
  view.unmount()
  renderDrawer()
  await screen.findByRole('button', { name: 'Create code' })
  expect(screen.queryByText('promo_test_secret')).not.toBeInTheDocument()
})

test('unredeemed codes disable while claimed benefits revoke through distinct actions', async () => {
  promotions = [
    available,
    {
      ...available,
      id: 6,
      name: 'Claimed',
      starts_at: 1,
      expires_at: 4_000_000_000,
      status: 'active',
    },
  ]
  vi.spyOn(api, 'post').mockResolvedValue({
    data: { success: true, data: available },
  })
  renderDrawer()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Disable code' })
  )
  await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      '/api/customer-pricing/codes/5/disable'
    )
  )
  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  )
  await userEvent.click(screen.getByRole('button', { name: 'Revoke benefit' }))
  await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      '/api/customer-pricing/codes/6/revoke'
    )
  )
})

test('custom rates require choosing a known model rather than submitting search text', async () => {
  const save = vi.spyOn(api, 'put')
  renderDrawer()
  const model = await screen.findByRole('combobox', { name: 'Model name' })
  await userEvent.click(model)
  await userEvent.type(model, 'not-a-model')
  expect(await screen.findByText('No models found')).toBeVisible()
  await userEvent.keyboard('{Escape}')
  await userEvent.click(screen.getByRole('button', { name: 'Save model rate' }))
  expect(save).not.toHaveBeenCalled()
})

test('empty model catalog disables saving and shows an empty state', async () => {
  const existing = vi.mocked(api.get).getMockImplementation()
  if (!existing) throw new Error('Missing fixture')
  vi.mocked(api.get).mockImplementation(async (url, options) => {
    if (url === '/api/customer-pricing/models') {
      return { data: { success: true, data: [] } }
    }
    return existing(url, options)
  })
  renderDrawer()
  expect(
    await screen.findByText('No models available for pricing')
  ).toBeVisible()
  expect(screen.getByRole('combobox', { name: 'Model name' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Save model rate' })).toBeDisabled()
})

test('failed catalog loading disables model saves and can be retried', async () => {
  const existing = vi.mocked(api.get).getMockImplementation()
  if (!existing) throw new Error('Missing fixture')
  let failing = true
  vi.mocked(api.get).mockImplementation(async (url, options) => {
    if (url === '/api/customer-pricing/models' && failing) {
      throw new Error('Catalog unavailable')
    }
    return existing(url, options)
  })
  renderDrawer()
  const retry = await screen.findByRole('button', { name: 'Retry' })
  expect(screen.getByRole('button', { name: 'Save model rate' })).toBeDisabled()
  failing = false
  await userEvent.click(retry)
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Model name' })).toBeEnabled()
  )
})

test('editing a billing-normalized rate selects its available catalog model', async () => {
  pricing.model_prices = [{ model_name: 'canonical-model', multiplier: 0.7 }]
  const existing = vi.mocked(api.get).getMockImplementation()
  if (!existing) throw new Error('Missing fixture')
  vi.mocked(api.get).mockImplementation(async (url, options) => {
    if (url === '/api/customer-pricing/models') {
      return {
        data: {
          success: true,
          data: [
            {
              model_name: 'available-alias',
              billing_model_name: 'canonical-model',
            },
          ],
        },
      }
    }
    return existing(url, options)
  })
  renderDrawer()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Edit rate for canonical-model' })
  )
  expect(screen.getByRole('combobox', { name: 'Model name' })).toHaveValue(
    'available-alias'
  )
  expect(screen.getByRole('button', { name: 'Save model rate' })).toBeEnabled()
})
