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
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { PublicHeader } from '../components/public-header'

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
  clients.forEach((client) => client.clear())
  clients.length = 0
  useAuthStore.getState().auth.reset()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  localStorage.clear()
  vi.useRealTimers()
})

async function renderPublicHeader() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  clients.push(client)
  client.setQueryData(['status'], {
    announcements_enabled: false,
    HeaderNavModules: JSON.stringify({
      home: false,
      console: false,
      pricing: { enabled: false },
      docs: false,
      about: false,
    }),
  })
  client.setQueryData(['notice'], { success: true, data: '' })

  const signInGuard = vi.fn()
  const root = createRootRoute({ component: Outlet })
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <PublicHeader showNotifications={false} />,
  })
  const signIn = createRoute({
    getParentRoute: () => root,
    path: '/sign-in',
    beforeLoad: signInGuard,
    component: () => <h1>Sign-in destination</h1>,
  })
  const router = createRouter({
    routeTree: root.addChildren([home, signIn]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
    defaultPreload: 'intent',
    defaultPreloadDelay: 25,
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return {
    signInGuard,
    link: within(screen.getByRole('banner')).getByRole('button', {
      name: 'Sign in',
    }),
  }
}

it('hovering Sign in does not run the authentication route guard when intent preloading is enabled', async () => {
  const { signInGuard, link } = await renderPublicHeader()
  vi.useFakeTimers()

  fireEvent.mouseEnter(link)
  await act(() => vi.advanceTimersByTimeAsync(25))

  expect(signInGuard).not.toHaveBeenCalled()
  expect(screen.getByRole('banner')).toBeVisible()
})

it('clicking Sign in still runs the authentication route guard and opens the sign-in destination', async () => {
  const user = userEvent.setup()
  const { signInGuard, link } = await renderPublicHeader()

  await user.click(link)

  expect(signInGuard).toHaveBeenCalledTimes(1)
  expect(
    await screen.findByRole('heading', { name: 'Sign-in destination' })
  ).toBeVisible()
})
