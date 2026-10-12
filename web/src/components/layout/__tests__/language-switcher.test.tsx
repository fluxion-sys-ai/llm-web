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
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { PublicHeader } from '../components/public-header'

const clients: QueryClient[] = []

beforeEach(async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  useAuthStore.getState().auth.reset()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  useSystemConfigStore.getState().setLoading(false)
  localStorage.clear()
  await i18next.changeLanguage('en')
})

afterEach(async () => {
  cleanup()
  clients.forEach((client) => client.clear())
  clients.length = 0
  useAuthStore.getState().auth.reset()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  localStorage.clear()
  vi.restoreAllMocks()
  await i18next.changeLanguage('en')
})

async function renderSignedOutHeader() {
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

  const root = createRootRoute({
    component: () => <PublicHeader showNotifications={false} />,
  })
  const home = createRoute({ getParentRoute: () => root, path: '/' })
  const router = createRouter({
    routeTree: root.addChildren([home]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

it('signed-out visitor picks a language from the header globe menu and the interface switches without saving to an account', async () => {
  const user = userEvent.setup()
  const put = vi.spyOn(api, 'put')
  await renderSignedOutHeader()

  await user.click(
    within(screen.getByRole('banner')).getByRole('button', {
      name: 'Change language',
    })
  )
  await user.click(await screen.findByRole('menuitem', { name: '简体中文' }))

  expect(i18next.language).toBe('zhCN')
  expect(put).not.toHaveBeenCalled()
})

it('the header language menu offers only English and Simplified Chinese', async () => {
  const user = userEvent.setup()
  await renderSignedOutHeader()

  await user.click(
    within(screen.getByRole('banner')).getByRole('button', {
      name: 'Change language',
    })
  )

  const options = await screen.findAllByRole('menuitem')
  expect(options.map((option) => option.textContent)).toEqual([
    'English',
    '简体中文',
  ])
})

it('opening the mobile menu shows the current language and choosing another one switches the interface', async () => {
  const user = userEvent.setup()
  await renderSignedOutHeader()

  await user.click(
    screen.getByRole('button', { name: 'Toggle navigation menu' })
  )
  const banner = screen.getByRole('banner')
  const [field] = screen
    .getAllByRole('button', { name: 'Change language' })
    .filter((button) => !banner.contains(button))
  expect(field).toHaveTextContent('English')

  await user.click(field)
  await user.click(await screen.findByRole('menuitem', { name: '简体中文' }))

  expect(i18next.language).toBe('zhCN')
  expect(field).toHaveTextContent('简体中文')
})
