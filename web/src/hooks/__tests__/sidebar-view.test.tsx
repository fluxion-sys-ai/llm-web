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
  createRouter,
  RouterContextProvider,
} from '@tanstack/react-router'
import { cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { ROLE } from '@/lib/roles'
import { type AuthUser, useAuthStore } from '@/stores/auth-store'

import { useSidebarView } from '../use-sidebar-view'

const clients: QueryClient[] = []

afterEach(() => {
  cleanup()
  clients.forEach((client) => client.clear())
  clients.length = 0
  useAuthStore.getState().auth.reset()
})

function sidebarViewFor(user: AuthUser, admin?: object) {
  useAuthStore.getState().auth.setUser(user)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  client.setQueryData(['status'], {
    SidebarModulesAdmin: admin ? JSON.stringify(admin) : '',
  })
  client.setQueryData(['observability', user.id, user.role, undefined], false)
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  function Wrapper(props: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <RouterContextProvider router={router}>
          {props.children}
        </RouterContextProvider>
      </QueryClientProvider>
    )
  }

  return renderHook(() => useSidebarView(), { wrapper: Wrapper })
}

describe('sidebar role and permission visibility', () => {
  it('restores customer pages hidden by personal settings without exposing administrator entries', () => {
    const { result } = sidebarViewFor({
      id: 1,
      username: 'alice',
      role: ROLE.USER,
      sidebar_modules: JSON.stringify({
        chat: { enabled: false },
        console: { enabled: false },
        personal: { enabled: false },
        admin: { enabled: true },
      }),
    })
    const groups = result.current.navGroups
    const urls = groups.flatMap((group) => group.items.map((item) => item.url))

    expect(urls).toEqual(
      expect.arrayContaining([
        '/playground',
        '/dashboard/overview',
        '/keys',
        '/wallet',
        '/profile',
        '/security',
      ])
    )
    expect(groups.some((group) => group.id === 'admin')).toBe(false)
    expect(urls).not.toContain('/channels')
    expect(urls).not.toContain('/system-settings/site')
  })

  it('retains administrator module restrictions and super-admin role requirements', () => {
    const { result } = sidebarViewFor(
      {
        id: 2,
        username: 'operator',
        role: ROLE.ADMIN,
        sidebar_modules: JSON.stringify({ admin: { enabled: false } }),
      },
      { admin: { enabled: true, channel: false } }
    )
    const urls = result.current.navGroups.flatMap((group) =>
      group.items.map((item) => item.url)
    )

    expect(urls).toContain('/models/metadata')
    expect(urls).toContain('/system-settings/site')
    expect(urls).not.toContain('/channels')
    expect(urls).not.toContain('/system-info')
    expect(urls).not.toContain('/task-plugins')
  })

  it.each([false, true])(
    'keeps customer-pricing visibility tied to the read capability (%s)',
    (allowed) => {
      const { result } = sidebarViewFor({
        id: 2,
        username: 'operator',
        role: ROLE.ADMIN,
        permissions: {
          admin_permissions: { customer_pricing: { read: allowed } },
        },
      })
      const urls = result.current.navGroups.flatMap((group) =>
        group.items.map((item) => item.url)
      )

      expect(urls.includes('/customer-pricing')).toBe(allowed)
    }
  )
})
