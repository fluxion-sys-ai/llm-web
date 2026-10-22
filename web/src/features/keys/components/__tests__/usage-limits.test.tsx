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
  within,
} from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { defaultLLMUsageRules } from '../../lib/usage-policy'
import { UsageLimitDialog } from '../usage-limit-dialog'

const clients: QueryClient[] = []
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((c) => c.clear())
})
function mount(keyId?: number) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  clients.push(client)
  return render(
    <QueryClientProvider client={client}>
      <UsageLimitDialog open onOpenChange={() => {}} keyId={keyId} />
    </QueryClientProvider>
  )
}
const summary = {
  policy: {
    ...defaultLLMUsageRules,
    enabled: true,
    output: { capacity: 100, refill: 10 },
  },
  balance: [0, 0, 80, 0],
  active: 2,
  unresolved: 0,
  key: { policy: defaultLLMUsageRules, balance: [0, 0, 0, 0], active: 0 },
}

test('account limit view is read only', async () => {
  const get = vi
    .spyOn(api, 'get')
    .mockResolvedValue({ data: { success: true, data: summary } })
  mount()
  expect(
    await screen.findByRole('region', { name: 'Account usage limits' })
  ).toHaveTextContent('80')
  expect(get).toHaveBeenCalledWith('/api/user/self/usage-limits')
  expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
})

test('editing a key posts only its policy to the key endpoint', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: summary },
  })
  const put = vi
    .spyOn(api, 'put')
    .mockResolvedValue({ data: { success: true } })
  mount(7)
  const input = await screen.findByRole('spinbutton', {
    name: 'Maximum concurrent operations for this key',
  })
  fireEvent.change(input, { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(put).toHaveBeenCalledWith('/api/token/7/usage-limits', {
      ...defaultLLMUsageRules,
      max_concurrent: 2,
    })
  )
  expect(put.mock.calls[0][1]).not.toHaveProperty('user_overrides')
})

test('long key form keeps the dialog frame from becoming a second scroll container', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: summary },
  })
  mount(7)
  await screen.findByRole('spinbutton', {
    name: 'Maximum concurrent operations for this key',
  })
  expect(screen.getByRole('dialog')).toHaveClass('overflow-clip')
})

test('invalid bucket cannot be submitted', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: summary },
  })
  const put = vi.spyOn(api, 'put')
  mount(7)
  const input = await screen.findByRole('spinbutton', {
    name: /Burst capacity.*Output tokens/,
  })
  fireEvent.change(input, { target: { value: '10' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(
    await screen.findByText(
      'Capacity and refill must both be positive, or both zero to disable this bucket.'
    )
  ).toBeInTheDocument()
  expect(put).not.toHaveBeenCalled()
})

test('failed save preserves the edit for retry', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: summary },
  })
  vi.spyOn(api, 'put').mockRejectedValue(new Error('offline'))
  mount(7)
  const input = await screen.findByRole('spinbutton', {
    name: 'Maximum concurrent operations for this key',
  })
  fireEvent.change(input, { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Failed to save usage limits. Please retry.'
  )
  expect(input).toHaveValue(2)
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
})

test('failed lookup offers retry without editable defaults', async () => {
  vi.spyOn(api, 'get').mockRejectedValue(new Error('offline'))
  mount(7)
  expect(await screen.findByRole('button', { name: 'Retry' })).toBeEnabled()
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
})

test('account summary displays debt and unresolved usage', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: { ...summary, balance: [0, 0, -3, 0], unresolved: 1 },
    },
  })
  mount()
  const region = await screen.findByRole('region', {
    name: 'Account usage limits',
  })
  expect(within(region).getByText('-3')).toBeInTheDocument()
  expect(within(region).getByRole('status')).toHaveTextContent(
    'Usage is awaiting reconciliation.'
  )
})

test('estimated usage is distinguished from blocked reconciliation', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: { ...summary, estimated: 1 } },
  })
  mount()
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Some usage is estimated. Limits will be adjusted when final usage arrives.'
  )
  expect(
    screen.queryByText('Usage is awaiting reconciliation.')
  ).not.toBeInTheDocument()
})
