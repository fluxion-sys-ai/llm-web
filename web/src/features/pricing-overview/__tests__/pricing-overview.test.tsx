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
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { PricingData } from '@/features/pricing/types'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { PricingOverviewPage } from '..'

const clients: QueryClient[] = []
const pricing: PricingData = {
  success: true,
  data: [
    {
      id: 1,
      model_name: 'catalog-model',
      display_name: 'Catalog Model',
      quota_type: 0,
      model_ratio: 0,
      completion_ratio: 0,
      pricing_status: 'pending',
      enable_groups: [],
    },
  ],
  vendors: [],
  group_ratio: {},
  usable_group: {},
  supported_endpoint: {},
  auto_groups: [],
}

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

async function renderPricingOverview() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  })
  clients.push(client)
  client.setQueryData(['status'], { announcements_enabled: false })
  client.setQueryData(['notice'], { success: true, data: '' })
  client.setQueryData(['pricing'], pricing)

  const root = createRootRoute({ component: Outlet })
  const overview = createRoute({
    getParentRoute: () => root,
    path: '/pricing/overview',
    component: PricingOverviewPage,
  })
  const models = createRoute({
    getParentRoute: () => root,
    path: '/pricing',
    component: () => <h1>All models destination</h1>,
  })
  const details = createRoute({
    getParentRoute: () => root,
    path: '/pricing/$modelId',
    component: () => <h1>Model details destination</h1>,
  })
  const gpu = createRoute({
    getParentRoute: () => root,
    path: '/gpu',
    component: () => <h1>GPU configuration destination</h1>,
  })
  const router = createRouter({
    routeTree: root.addChildren([overview, models, details, gpu]),
    history: createMemoryHistory({ initialEntries: ['/pricing/overview'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return router
}

it('defaults to LLM API and switches visible pricing panels with mouse and keyboard', async () => {
  const user = userEvent.setup()
  await renderPricingOverview()

  expect(screen.getByRole('tab', { name: 'LLM API' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  expect(screen.getByRole('tabpanel', { name: 'LLM API' })).toBeVisible()
  expect(
    screen.queryByRole('tabpanel', { name: 'GPU compute' })
  ).not.toBeInTheDocument()

  await user.click(screen.getByRole('tab', { name: 'GPU compute' }))

  expect(screen.getByRole('tab', { name: 'GPU compute' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  expect(screen.getByRole('tabpanel', { name: 'GPU compute' })).toBeVisible()
  expect(
    screen.queryByRole('tabpanel', { name: 'LLM API' })
  ).not.toBeInTheDocument()

  await user.keyboard('{ArrowLeft}')
  expect(screen.getByRole('tab', { name: 'LLM API' })).toHaveFocus()
  await user.keyboard('{Enter}')

  expect(screen.getByRole('tab', { name: 'LLM API' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  expect(screen.getByRole('tabpanel', { name: 'LLM API' })).toBeVisible()
})

it('an unpublished model with zero ratios shows pending input and output prices instead of free usage', async () => {
  await renderPricingOverview()
  const panel = screen.getByRole('tabpanel', { name: 'LLM API' })
  const row = within(panel).getByRole('row', { name: /Catalog Model/ })

  expect(within(row).getByText('Input')).toBeVisible()
  expect(within(row).getByText('Output')).toBeVisible()
  expect(within(row).getAllByText('To be configured')).toHaveLength(2)
  expect(within(row).getByText('Per 1M tokens')).toBeVisible()
  expect(within(row).queryByText(/free/i)).not.toBeInTheDocument()
  expect(within(row).queryByText(/[$¥€]/)).not.toBeInTheDocument()
})

it('model names open the canonical model detail and All Models opens the model catalog', async () => {
  const user = userEvent.setup()
  const router = await renderPricingOverview()
  const modelLink = within(screen.getByRole('main')).getByRole('link', {
    name: /Catalog Model/,
  })

  expect(modelLink).toHaveAttribute('href', '/pricing/catalog-model')
  await user.click(modelLink)

  expect(
    await screen.findByRole('heading', { name: 'Model details destination' })
  ).toBeVisible()
  expect(router.state.location.pathname).toBe('/pricing/catalog-model')

  await act(async () => router.history.back())
  const allModels = within(await screen.findByRole('main')).getByRole('link', {
    name: 'All Models',
  })
  expect(allModels).toHaveAttribute('href', '/pricing')
  await user.click(allModels)

  expect(
    await screen.findByRole('heading', { name: 'All models destination' })
  ).toBeVisible()
})

it('GPU pricing lists six supported models with pending hourly prices and links to the chosen configuration', async () => {
  const user = userEvent.setup()
  const router = await renderPricingOverview()
  await user.click(screen.getByRole('tab', { name: 'GPU compute' }))
  const panel = screen.getByRole('tabpanel', { name: 'GPU compute' })

  expect(within(panel).getAllByRole('row')).toHaveLength(7)
  expect(within(panel).getAllByText('To be configured')).toHaveLength(6)
  expect(within(panel).queryByText(/RTX/)).not.toBeInTheDocument()
  expect(within(panel).queryByText(/[$¥€]/)).not.toBeInTheDocument()
  const configuration = within(panel).getByRole('link', {
    name: 'View configuration for B300',
  })
  expect(configuration).toHaveAttribute('href', '/gpu?gpu=b300')

  await user.click(configuration)

  expect(
    await screen.findByRole('heading', {
      name: 'GPU configuration destination',
    })
  ).toBeVisible()
  expect(router.state.location.search).toEqual({ gpu: 'b300' })
})
