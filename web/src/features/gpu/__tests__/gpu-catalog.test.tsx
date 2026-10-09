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
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { Route } from '@/routes/gpu'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { GpuCatalogPage } from '..'

const clients: QueryClient[] = []

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  useAuthStore.getState().auth.reset()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  useSystemConfigStore.getState().setLoading(false)
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  useAuthStore.getState().auth.reset()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  localStorage.clear()
})

async function renderGpuCatalog(path = '/gpu') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  })
  clients.push(client)
  client.setQueryData(['status'], { announcements_enabled: false })
  client.setQueryData(['notice'], { success: true, data: '' })

  const root = createRootRoute({ component: Outlet })
  const gpu = createRoute({
    getParentRoute: () => root,
    path: 'gpu',
    component: Outlet,
  })
  const catalog = createRoute({
    getParentRoute: () => gpu,
    path: '/',
    validateSearch: Route.options.validateSearch,
    component: GpuCatalogPage,
  })
  const router = createRouter({
    routeTree: root.addChildren([gpu.addChildren([catalog])]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return router
}

it('searching the GPU name is case insensitive and clearing it restores the catalog', async () => {
  const user = userEvent.setup()
  await renderGpuCatalog()
  const search = screen.getByRole('searchbox', { name: 'Search GPUs' })

  await user.type(search, 'a100')

  expect(
    screen.getAllByRole('button', { name: /^View configuration for / })
  ).toHaveLength(2)
  expect(
    screen.getByRole('button', { name: 'View configuration for A100 PCIe 80G' })
  ).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'View configuration for A100 80G' })
  ).toBeVisible()

  await user.clear(search)

  expect(
    screen.getAllByRole('button', { name: /^View configuration for / })
  ).toHaveLength(6)
})

it('generation and VRAM filters combine to show only a matching GPU', async () => {
  const user = userEvent.setup()
  await renderGpuCatalog()

  await user.click(screen.getByRole('combobox', { name: 'GPU generation' }))
  await user.click(await screen.findByRole('option', { name: 'Hopper' }))

  expect(
    screen.getAllByRole('button', { name: /^View configuration for / })
  ).toHaveLength(2)

  await user.click(screen.getByRole('combobox', { name: 'GPU memory' }))
  await user.click(await screen.findByRole('option', { name: '80 GB' }))

  expect(
    screen.getAllByRole('button', { name: /^View configuration for / })
  ).toHaveLength(1)
  expect(
    screen.getByRole('button', { name: 'View configuration for H100' })
  ).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'View configuration for H200' })
  ).not.toBeInTheDocument()
})

it('clearing an empty filtered result resets search, generation, and VRAM together', async () => {
  const user = userEvent.setup()
  await renderGpuCatalog()

  await user.type(screen.getByRole('searchbox', { name: 'Search GPUs' }), 'b')
  await user.click(screen.getByRole('combobox', { name: 'GPU generation' }))
  await user.click(await screen.findByRole('option', { name: 'Blackwell' }))
  await user.click(screen.getByRole('combobox', { name: 'GPU memory' }))
  await user.click(await screen.findByRole('option', { name: '80 GB' }))

  expect(screen.getByText('No GPUs match your filters')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: /^View configuration for / })
  ).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Clear filters' }))

  expect(screen.getByRole('searchbox', { name: 'Search GPUs' })).toHaveValue('')
  expect(
    screen.getByRole('combobox', { name: 'GPU generation' })
  ).toHaveTextContent('All generations')
  expect(
    screen.getByRole('combobox', { name: 'GPU memory' })
  ).toHaveTextContent('Any VRAM')
  expect(
    screen.getAllByRole('button', { name: /^View configuration for / })
  ).toHaveLength(6)
})

it('a GPU deep link opens its configuration and updates total VRAM and workload selection', async () => {
  const user = userEvent.setup()
  await renderGpuCatalog('/gpu?gpu=h200')
  const dialog = await screen.findByRole('dialog', {
    name: 'Configuration preview',
  })
  const count = within(dialog).getByRole('radiogroup', { name: 'GPU count' })
  const workload = within(dialog).getByRole('radiogroup', { name: 'Workload' })

  expect(
    within(dialog).getByRole('heading', { name: 'NVIDIA H200' })
  ).toBeVisible()
  expect(within(count).getByRole('radio', { name: /^1$/ })).toBeChecked()
  expect(
    within(workload).getByRole('radio', { name: 'Inference' })
  ).toBeChecked()

  await user.click(within(count).getByRole('radio', { name: /^4$/ }))
  await user.click(within(workload).getByRole('radio', { name: 'Training' }))

  expect(within(count).getByRole('radio', { name: /^4$/ })).toBeChecked()
  expect(within(dialog).getByText('564 GB')).toBeVisible()
  expect(
    within(workload).getByRole('radio', { name: 'Training' })
  ).toBeChecked()
  expect(
    within(workload).getByRole('radio', { name: 'Inference' })
  ).not.toBeChecked()
})

it('opening a GPU configuration with the keyboard updates its URL and Escape removes the selection', async () => {
  const user = userEvent.setup()
  const router = await renderGpuCatalog()
  const action = screen.getByRole('button', {
    name: 'View configuration for B300',
  })

  act(() => action.focus())
  await user.keyboard('{Enter}')

  const dialog = await screen.findByRole('dialog', {
    name: 'Configuration preview',
  })
  expect(
    within(dialog).getByRole('heading', { name: 'NVIDIA B300' })
  ).toBeVisible()
  expect(router.state.location.search).toEqual({ gpu: 'b300' })

  await user.keyboard('{Escape}')

  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
  expect(router.state.location.search).toEqual({})
})

it('an unknown GPU deep link leaves the catalog available without a configuration dialog', async () => {
  await renderGpuCatalog('/gpu?gpu=unknown-gpu')

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(
    screen.getAllByRole('button', { name: /^View configuration for / })
  ).toHaveLength(6)
})
