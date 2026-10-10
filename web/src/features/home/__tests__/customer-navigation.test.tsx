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
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type RouteComponent,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'

import { LlmHero } from '../components/sections/llm-hero'

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    ...media,
    media: query,
    matches: query === '(prefers-reduced-motion: reduce)',
  }))
})

async function renderLandingSection(component: RouteComponent) {
  const rootRoute = createRootRoute({ component: Outlet })
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component,
  })
  const destinations = ['/playground', '/pricing'].map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => <h1>{path}</h1>,
    })
  )
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, ...destinations]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
}

test('the primary homepage action opens the Playground with the keyboard', async () => {
  const user = userEvent.setup()
  await renderLandingSection(LlmHero)

  await user.tab()
  expect(screen.getByRole('link', { name: 'Open Playground' })).toHaveFocus()
  await user.keyboard('{Enter}')

  expect(
    await screen.findByRole('heading', { name: '/playground' })
  ).toBeVisible()
})

test('the hero offers model pricing as its secondary destination', async () => {
  await renderLandingSection(LlmHero)

  expect(
    screen.getByRole('link', { name: 'Models & Pricing' })
  ).toHaveAttribute('href', '/pricing')
})

test('the hero states the Fluxion slogan as its headline and subline', async () => {
  await renderLandingSection(LlmHero)

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Ultra-fast, efficient inference for AI, built by AI.'
  )
  expect(screen.getByText('Any model, any chip, lowest cost.')).toBeVisible()
  expect(
    screen.getByRole('figure', {
      name: /An inference engine is built for every model and chip pairing/,
    })
  ).toBeInTheDocument()
})
