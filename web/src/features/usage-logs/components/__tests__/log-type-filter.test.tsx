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
  RouterProvider,
} from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { CommonLogsFilterBar } from '../common-logs-filter-bar'
import { UsageLogsProvider } from '../usage-logs-provider'

function FilterFixture() {
  const table = useReactTable({
    data: [],
    columns: [],
    getCoreRowModel: getCoreRowModel(),
  })
  return (
    <UsageLogsProvider>
      <CommonLogsFilterBar table={table} />
    </UsageLogsProvider>
  )
}

async function renderFilter(initialEntry = '/usage-logs/common') {
  vi.spyOn(api, 'get').mockImplementation(async (url) => ({
    data: {
      success: true,
      data: url === '/api/user/self/groups' ? {} : { quota: 0, rpm: 0, tpm: 0 },
    },
  }))
  const root = createRootRoute()
  const auth = createRoute({ getParentRoute: () => root, id: '_authenticated' })
  const logs = createRoute({
    getParentRoute: () => auth,
    path: '/usage-logs/$section',
    component: FilterFixture,
    validateSearch: (search: Record<string, unknown>) => search,
  })
  const router = createRouter({
    routeTree: root.addChildren([auth.addChildren([logs])]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await screen.findByRole('combobox', { name: 'Type' })
  return router
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('hides retired log types from the menu while keeping active filters selectable', async () => {
  const router = await renderFilter()
  await userEvent.click(screen.getByRole('combobox', { name: 'Type' }))
  for (const label of ['Manage', 'Login']) {
    expect(
      screen.queryByRole('option', { name: new RegExp(`^${label}`) })
    ).not.toBeInTheDocument()
  }
  for (const label of [
    'All Types',
    'Top-up',
    'Consume',
    'System',
    'Error',
    'Refund',
  ]) {
    expect(screen.getByRole('option', { name: label })).toBeVisible()
  }
  await userEvent.click(screen.getByRole('option', { name: 'Consume' }))
  await userEvent.click(screen.getByRole('button', { name: 'Search' }))
  await waitFor(() =>
    expect(router.state.location.search).toMatchObject({ type: ['2'], page: 1 })
  )
})

it.each([
  ['Manage', '3'],
  ['Login', '7'],
])(
  'preserves a saved %s filter and lets the user switch to All Types',
  async (label, value) => {
    const router = await renderFilter(
      `/usage-logs/common?type=${encodeURIComponent(JSON.stringify([value]))}`
    )
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent(
      label
    )
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ type: [value] })
    )
    await userEvent.click(screen.getByRole('combobox', { name: 'Type' }))
    expect(
      screen.queryByRole('option', { name: new RegExp(`^${label}`) })
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: 'All Types' }))
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ type: ['0'] })
    )
  }
)
