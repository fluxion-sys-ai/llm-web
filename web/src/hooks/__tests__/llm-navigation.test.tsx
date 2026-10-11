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
import { cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { useSidebarConfig } from '../use-sidebar-config'
import { useSidebarData } from '../use-sidebar-data'
import { useTopNavLinks } from '../use-top-nav-links'

const clients: QueryClient[] = []

beforeEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})

afterEach(() => {
  cleanup()
  clients.forEach((client) => client.clear())
  clients.length = 0
  useAuthStore.getState().auth.reset()
  localStorage.clear()
})

function renderNavigation(status: Record<string, unknown> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  client.setQueryData(['status'], status)

  function Wrapper(props: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {props.children}
      </QueryClientProvider>
    )
  }

  return renderHook(
    () => ({
      sidebar: useSidebarConfig(useSidebarData().navGroups),
      topNav: useTopNavLinks(),
    }),
    { wrapper: Wrapper }
  )
}

describe('LLM navigation', () => {
  it('default customer navigation retains the existing LLM and account pages without external chat or task entries', () => {
    const { result } = renderNavigation()
    const items = result.current.sidebar
      .filter((group) => group.id !== 'admin')
      .flatMap((group) => group.items)
    const urls = items.map((item) => item.url)

    expect(urls).toEqual(
      expect.arrayContaining([
        '/playground',
        '/dashboard/overview',
        '/dashboard/models',
        '/keys',
        '/usage-logs/common',
        '/usage-logs/audit',
        '/wallet',
        '/profile',
        '/security',
      ])
    )
    expect(urls).not.toContain('/usage-logs/task')
    expect(urls).not.toContain('/pricing')
    expect(urls).not.toContain('/usage-logs/drawing')
    expect(items.some((item) => item.type === 'chat-presets')).toBe(false)
  })

  it('orders the main navigation as Home, Console, Models, GPU, Pricing, and Docs without Blog', () => {
    const { result } = renderNavigation()

    expect(result.current.topNav.map((link) => link.href)).toEqual([
      '/',
      '/dashboard',
      '/pricing',
      '/gpu',
      '/pricing/overview',
      '/docs',
    ])
  })

  it('keeps the GPU catalog available when gateway navigation modules are disabled', () => {
    const { result } = renderNavigation({
      HeaderNavModules: JSON.stringify({
        home: false,
        console: false,
        pricing: { enabled: false },
        docs: false,
      }),
    })

    expect(result.current.topNav).toEqual([{ title: 'GPU', href: '/gpu' }])
  })

  it('a disabled pricing module hides public model links while the console omits them', () => {
    const { result } = renderNavigation({
      HeaderNavModules: JSON.stringify({ pricing: { enabled: false } }),
    })

    expect(
      result.current.sidebar.flatMap((group) =>
        group.items.map((item) => item.url)
      )
    ).not.toContain('/pricing')
    expect(result.current.topNav.map((link) => link.href)).not.toContain(
      '/pricing'
    )
    expect(result.current.topNav.map((link) => link.href)).not.toContain(
      '/pricing/overview'
    )
  })

  it('enabled ranking configuration does not add rankings to the LLM website navigation', () => {
    const { result } = renderNavigation({
      HeaderNavModules: JSON.stringify({
        rankings: { enabled: true },
        pricing: { enabled: true, requireAuth: true },
      }),
    })

    expect(result.current.topNav.map((link) => link.href)).not.toContain(
      '/rankings'
    )
    expect(
      result.current.topNav.find((link) => link.href === '/pricing')
    ).toMatchObject({ title: 'Models', requiresAuth: true })
    expect(
      result.current.topNav.find((link) => link.href === '/pricing/overview')
    ).toMatchObject({ title: 'Pricing', requiresAuth: true })
  })

  it('exposes internal Docs as a direct link despite a legacy external docs URL', () => {
    const { result } = renderNavigation({ docs_link: 'https://docs.newapi.ai' })

    expect(result.current.topNav).toEqual(
      expect.arrayContaining([{ title: 'Docs', href: '/docs' }])
    )
    expect(
      result.current.topNav.some((link) => link.title === 'Resources')
    ).toBe(false)
    expect(result.current.topNav.some((link) => link.external)).toBe(false)
  })

  it('a disabled documentation module hides Docs from the main navigation', () => {
    const { result } = renderNavigation({
      HeaderNavModules: JSON.stringify({ docs: false }),
    })

    expect(result.current.topNav.some((link) => link.href === '/docs')).toBe(
      false
    )
  })

  it('existing sidebar configuration can still hide Playground and both dashboard entries', () => {
    const { result } = renderNavigation({
      SidebarModulesAdmin: JSON.stringify({
        chat: { enabled: true, playground: false },
        console: { enabled: true, detail: false },
      }),
    })
    const urls = result.current.sidebar.flatMap((group) =>
      group.items.map((item) => item.url)
    )

    expect(urls).not.toContain('/playground')
    expect(urls).not.toContain('/dashboard/overview')
    expect(urls).not.toContain('/dashboard/models')
    expect(urls).toContain('/keys')
    expect(urls).not.toContain('/pricing')
  })

  it('existing administrator destinations remain available with their role requirements', () => {
    const { result } = renderNavigation()
    const items = result.current.sidebar.find(
      (group) => group.id === 'admin'
    )?.items

    expect(items?.map((item) => item.url)).toEqual([
      '/channels',
      '/models/metadata',
      '/users',
      '/redemption-codes',
      '/subscriptions',
      '/system-info',
      '/task-plugins',
      '/system-settings/site',
    ])
    expect(items?.find((item) => item.url === '/task-plugins')).toMatchObject({
      requiredRole: 100,
    })
  })
})
