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
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { PublicHeader } from '../components/public-header'
import { PublicLayout } from '../components/public-layout'
import { PublicNavigation } from '../components/public-navigation'

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

async function renderPublicNavigation(
  surface: 'header' | 'standalone' | 'layout' | 'layout-footer',
  docs = true,
  path = '/docs/quickstart'
) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
    },
  })
  clients.push(client)
  client.setQueryData(['status'], {
    announcements_enabled: false,
    docs_link: 'https://docs.newapi.ai',
    HeaderNavModules: JSON.stringify({
      home: false,
      console: false,
      pricing: false,
      docs,
    }),
  })
  client.setQueryData(['notice'], { success: true, data: '' })
  const root = createRootRoute({
    component: () => {
      if (surface === 'layout' || surface === 'layout-footer') {
        return (
          <PublicLayout
            showFooter={surface === 'layout-footer' ? true : undefined}
            showNotifications={false}
          >
            <Outlet />
          </PublicLayout>
        )
      }
      return (
        <>
          {surface === 'header' ? (
            <PublicHeader showNotifications={false} />
          ) : (
            <PublicNavigation />
          )}
          <Outlet />
        </>
      )
    },
  })
  const routes = ['/', '/blog', '/docs', '/docs/quickstart'].map((route) =>
    createRoute({
      getParentRoute: () => root,
      path: route,
      component: () => <h1>{route}</h1>,
    })
  )
  const router = createRouter({
    routeTree: root.addChildren(routes),
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

it('public layout leaves footer ownership to existing pages by default', async () => {
  await renderPublicNavigation('layout')

  expect(screen.getByRole('main')).toBeVisible()
  expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
})

it('public layout exposes one site footer outside the constrained main when requested', async () => {
  await renderPublicNavigation('layout-footer')

  const footer = screen.getByRole('contentinfo')
  expect(footer).toBeVisible()
  expect(screen.getByRole('main')).not.toContainElement(footer)
})

it.each(['header', 'standalone'] as const)(
  '%s shows a direct Docs link without Blog and marks Docs active for a nested documentation page',
  async (surface) => {
    await renderPublicNavigation(surface)
    const navigation =
      surface === 'header'
        ? screen.getByRole('banner')
        : screen.getByRole('navigation')
    const docs = within(navigation).getByRole('link', { name: 'Docs' })

    expect(
      within(navigation).queryByRole('link', { name: 'Blog' })
    ).not.toBeInTheDocument()
    expect(docs).toHaveAttribute('href', '/docs')
    expect(docs).toHaveAttribute('aria-current', 'page')
    expect(
      within(navigation).queryByRole('button', { name: 'Resources' })
    ).not.toBeInTheDocument()
  }
)

it.each(['header', 'standalone'] as const)(
  '%s honors the disabled Docs module',
  async (surface) => {
    await renderPublicNavigation(surface, false)
    const navigation =
      surface === 'header'
        ? screen.getByRole('banner')
        : screen.getByRole('navigation')

    expect(
      within(navigation).queryByRole('link', { name: 'Docs' })
    ).not.toBeInTheDocument()
  }
)

it.each(['Docs'])(
  'the public mobile menu closes after clicking the direct %s link',
  async (label) => {
    const user = userEvent.setup()
    const router = await renderPublicNavigation('header', true, '/')
    const trigger = screen.getByRole('button', {
      name: 'Toggle navigation menu',
    })
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const navigation = screen.getByRole('navigation', { name: 'Navigation' })

    await user.click(within(navigation).getByRole('link', { name: label }))

    expect(
      await screen.findByRole('heading', { name: `/${label.toLowerCase()}` })
    ).toBeVisible()
    expect(router.state.location.pathname).toBe(`/${label.toLowerCase()}`)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(document.body.style.overflow).toBe('')
  }
)
