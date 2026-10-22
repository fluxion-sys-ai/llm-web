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
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { UsageReconciliationDialog } from '../usage-reconciliation-dialog'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
test('review submits verified cumulative usage only after confirmation', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: {
        operations: [
          {
            request_id: 'r',
            key_id: '7',
            status: 'unresolved',
            actual: [1, 2, 3, 4],
          },
        ],
        next_cursor: null,
      },
    },
  })
  const post = vi
    .spyOn(api, 'post')
    .mockResolvedValue({ data: { success: true } })
  render(
    <QueryClientProvider client={client}>
      <UsageReconciliationDialog open onOpenChange={() => {}} userId={42} />
    </QueryClientProvider>
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Review' }))
  expect(screen.getByRole('button', { name: 'Reconcile usage' })).toBeDisabled()
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Reconciliation reason' }),
    { target: { value: 'Verified provider report' } }
  )
  const cost = screen.getByRole('spinbutton', { name: 'User charges (USD)' })
  fireEvent.change(cost, { target: { value: '1.0000001' } })
  expect(screen.getByRole('button', { name: 'Reconcile usage' })).toBeDisabled()
  fireEvent.change(cost, { target: { value: '1.000001' } })
  expect(screen.getByRole('button', { name: 'Reconcile usage' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Reconcile usage' }))
  expect(post).not.toHaveBeenCalled()
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      '/api/usage-admin/42/operations/r/reconcile',
      { actual: [1, 2, 3, 1000001], reason: 'Verified provider report' }
    )
  )
  client.clear()
})
