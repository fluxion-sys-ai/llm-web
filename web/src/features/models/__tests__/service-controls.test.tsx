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
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { DataTableRowActions } from '../components/data-table-row-actions'
import { ModelsProvider } from '../components/models-provider'
import type { Model, ModelServiceStatus } from '../types'

const model: Model = {
  id: 0,
  model_name: 'GLM-5.3',
  name_rule: 0,
  status: 0,
  sync_official: 0,
  created_time: 0,
  updated_time: 0,
}
const active: ModelServiceStatus = {
  model_name: model.model_name,
  status: 'unknown',
  paused: false,
  reason: '',
  updated_at: 0,
}
const clients: QueryClient[] = []

function RowActions(props: { model: Model }) {
  const table = useReactTable({
    data: [props.model],
    columns: [],
    getCoreRowModel: getCoreRowModel(),
  })
  return (
    <ModelsProvider>
      <DataTableRowActions row={table.getRowModel().rows[0]} />
    </ModelsProvider>
  )
}

function mount(selected = model, cached?: ModelServiceStatus) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  clients.push(client)
  if (cached) {
    client.setQueryData(['model-service-status', selected.model_name], cached)
  }
  render(
    <QueryClientProvider client={client}>
      <RowActions model={selected} />
    </QueryClientProvider>
  )
  return client
}

async function openControls(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Open menu' }))
  await user.click(screen.getByRole('menuitem', { name: 'Service controls' }))
}

beforeEach(() =>
  useAuthStore.getState().auth.setUser({ id: 2, username: 'admin', role: 10 })
)
afterEach(() => {
  cleanup()
  for (const client of clients.splice(0)) client.clear()
  useAuthStore.getState().auth.reset()
})

it('loads the exact channel-only model lazily and pauses it without changing catalog visibility', async () => {
  const get = vi
    .spyOn(api, 'get')
    .mockResolvedValue({ data: { success: true, data: active } })
  const put = vi.spyOn(api, 'put').mockResolvedValue({
    data: {
      success: true,
      data: { ...active, paused: true, status: 'unavailable' },
    },
  })
  const client = mount()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const user = userEvent.setup()
  expect(get).not.toHaveBeenCalled()
  await openControls(user)
  expect(
    await screen.findByRole('button', { name: 'Pause service' })
  ).toBeEnabled()
  expect(get).toHaveBeenCalledWith('/api/models/service-status', {
    params: { model: 'GLM-5.3' },
  })
  expect(screen.getByRole('alertdialog')).toHaveTextContent(
    'Requests already in progress can finish.'
  )
  await user.type(
    screen.getByRole('textbox', { name: 'Pause reason (optional)' }),
    '  Scheduled GPU maintenance  '
  )
  await user.click(screen.getByRole('button', { name: 'Pause service' }))
  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  )
  expect(put).toHaveBeenCalledExactlyOnceWith('/api/models/service-status', {
    model_name: 'GLM-5.3',
    paused: true,
    reason: 'Scheduled GPU maintenance',
  })
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['model-service-status'],
  })
})

it('resumes an explicitly paused model without claiming health verification', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: {
        ...active,
        paused: true,
        status: 'unavailable',
        reason: 'Maintenance',
      },
    },
  })
  const put = vi
    .spyOn(api, 'put')
    .mockResolvedValue({ data: { success: true, data: active } })
  mount()
  const user = userEvent.setup()
  await openControls(user)
  expect(
    await screen.findByRole('button', { name: 'Resume service' })
  ).toBeEnabled()
  expect(screen.getByRole('alertdialog')).toHaveTextContent(
    'Resuming does not verify that the model is healthy.'
  )
  expect(screen.getByText('Pause reason: Maintenance')).toBeVisible()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Resume service' }))
  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  )
  expect(put).toHaveBeenCalledExactlyOnceWith('/api/models/service-status', {
    model_name: 'GLM-5.3',
    paused: false,
  })
})

it('does not offer resume for an outage without an administrative pause', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: { ...active, status: 'unavailable', reason: 'service_failure' },
    },
  })
  mount({ ...model, id: 7, status: 1 })
  const user = userEvent.setup()
  await openControls(user)
  expect(
    await screen.findByRole('button', { name: 'Pause service' })
  ).toBeEnabled()
  expect(
    screen.queryByRole('button', { name: 'Resume service' })
  ).not.toBeInTheDocument()
})

it('blocks changes when refreshing stale state fails and offers a safe retry', async () => {
  let reject!: (error: Error) => void
  const get = vi.spyOn(api, 'get').mockImplementationOnce(
    () =>
      new Promise((_resolve, rejectRequest) => {
        reject = rejectRequest
      })
  )
  const put = vi.spyOn(api, 'put')
  mount(model, { ...active, paused: true, status: 'unavailable' })
  const user = userEvent.setup()
  await openControls(user)
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  expect(
    screen.queryByRole('button', { name: 'Resume service' })
  ).not.toBeInTheDocument()
  await act(async () => reject(new Error('Network unavailable')))
  expect(
    await screen.findByText('Failed to load model service status')
  ).toBeVisible()
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  expect(put).not.toHaveBeenCalled()
  get.mockResolvedValue({ data: { success: true, data: active } })
  await user.click(screen.getByRole('button', { name: 'Retry' }))
  expect(
    await screen.findByRole('button', { name: 'Pause service' })
  ).toBeEnabled()
})

it('preserves the reason and dialog after a failed save and allows retry', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: active },
  })
  const put = vi
    .spyOn(api, 'put')
    .mockResolvedValueOnce({
      data: { success: false, message: 'Status update failed' },
    })
    .mockResolvedValue({
      data: {
        success: true,
        data: { ...active, paused: true, status: 'unavailable' },
      },
    })
  mount()
  const user = userEvent.setup()
  await openControls(user)
  await screen.findByRole('button', { name: 'Pause service' })
  await user.type(
    screen.getByRole('textbox', { name: 'Pause reason (optional)' }),
    'Maintenance'
  )
  await user.click(screen.getByRole('button', { name: 'Pause service' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Status update failed'
  )
  expect(
    screen.getByRole('textbox', { name: 'Pause reason (optional)' })
  ).toHaveValue('Maintenance')
  await user.click(screen.getByRole('button', { name: 'Pause service' }))
  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  )
  expect(put).toHaveBeenCalledTimes(2)
})

it('blocks repeated changes and dismissal while a pause is being saved', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: active },
  })
  let complete!: (response: unknown) => void
  const put = vi.spyOn(api, 'put').mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve
      })
  )
  mount()
  const user = userEvent.setup()
  await openControls(user)
  await user.click(await screen.findByRole('button', { name: 'Pause service' }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Pause service' })).toBeDisabled()
  )
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  expect(screen.getByRole('textbox')).toBeDisabled()
  await user.keyboard('{Escape}')
  expect(screen.getByRole('alertdialog')).toBeVisible()
  expect(put).toHaveBeenCalledTimes(1)
  await act(async () =>
    complete({ data: { success: true, data: { ...active, paused: true } } })
  )
  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  )
})

it.each([1, 2, 3])(
  'does not provide service controls for name rule %i',
  async (name_rule) => {
    const get = vi.spyOn(api, 'get')
    mount({ ...model, id: 7, name_rule })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(
      screen.queryByRole('menuitem', { name: 'Service controls' })
    ).not.toBeInTheDocument()
    expect(get).not.toHaveBeenCalled()
  }
)

it('does not expose service controls to an ordinary user', () => {
  useAuthStore.getState().auth.setUser({ id: 3, username: 'user', role: 1 })
  const get = vi.spyOn(api, 'get')
  mount()
  expect(
    screen.queryByRole('button', { name: 'Open menu' })
  ).not.toBeInTheDocument()
  expect(get).not.toHaveBeenCalled()
})

it('keeps changes disabled when the status response omits explicit pause state', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: { model_name: 'GLM-5.3', status: 'unavailable' },
    },
  })
  const put = vi.spyOn(api, 'put')
  mount()
  const user = userEvent.setup()
  await openControls(user)
  expect(
    await screen.findByText('Failed to load model service status')
  ).toBeVisible()
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(put).not.toHaveBeenCalled()
})
