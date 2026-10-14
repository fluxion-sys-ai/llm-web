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
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'

import type { PricingModel } from '@/features/pricing/types'

import { LlmFeaturedModels } from '../components/sections/llm-featured-models'

let client: QueryClient

afterEach(() => {
  cleanup()
  client.clear()
})

async function renderFeaturedModels(models: PricingModel[]) {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  client.setQueryData(['status'], {})
  client.setQueryData(['pricing'], {
    success: true,
    data: models,
    vendors: [],
    group_ratio: {},
    usable_group: {},
    supported_endpoint: {},
    auto_groups: [],
  })
  const rootRoute = createRootRoute({ component: Outlet })
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: LlmFeaturedModels,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

test('a video-only backend still shows the complete featured cards from the reference', async () => {
  await renderFeaturedModels([
    {
      id: 1,
      model_name: 'Wan-3.0',
      quota_type: 0,
      model_ratio: 1,
      completion_ratio: 1,
      enable_groups: ['default'],
      supported_endpoint_types: ['openai'],
    },
  ])
  const section = within(
    screen.getByRole('region', { name: 'Featured models' })
  )
  expect(
    section
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
  ).toEqual(['GLM 5.3', 'Kimi K3', 'DeepSeek V4.1 Flash'])
  const specs = section
    .getAllByLabelText('Model specifications')
    .map((element) => within(element))
  expect(specs).toHaveLength(3)
  for (const spec of specs) {
    for (const label of [
      'Context window',
      'Max output',
      'Input types',
      'Output types',
    ]) {
      expect(spec.getByText(label)).toBeVisible()
    }
    expect(spec.getAllByText('1.05M').length).toBeGreaterThan(0)
  }
  expect(specs[0].getByText('131.1K')).toBeVisible()
  expect(specs[1].getByText('Text · Image · Video')).toBeVisible()
  expect(specs[2].getByText('Text · Image')).toBeVisible()
  expect(section.getAllByRole('group', { name: 'Tags' })).toHaveLength(3)
  expect(section.getAllByText('+1')).toHaveLength(2)
  expect(section.getAllByText('USD / 1M tokens')).toHaveLength(3)
  expect(section.getAllByRole('button', { name: 'Details' })).toHaveLength(3)
  expect(section.queryByText('Coming soon')).not.toBeInTheDocument()
})

test('backend response order does not reorder the featured cards', async () => {
  await renderFeaturedModels(
    ['deepseek-v4.1-flash', 'GLM-5.3', 'Kimi-K3'].map((model_name, id) => ({
      id,
      model_name,
      quota_type: 0,
      model_ratio: 1,
      completion_ratio: 1,
      enable_groups: ['default'],
      supported_endpoint_types: ['openai'],
    }))
  )
  expect(
    screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
  ).toEqual(['GLM 5.3', 'Kimi K3', 'DeepSeek V4.1 Flash'])
})
