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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkIsActive } from '@/components/layout/lib/url-utils'
import type { NavGroup } from '@/components/layout/types'
import {
  parseSidebarModulesAdmin,
  serializeSidebarModulesAdmin,
} from '@/features/system-settings/maintenance/config'
import { useAuthStore } from '@/stores/auth-store'

import {
  useIsSidebarModuleVisible,
  useSidebarConfig,
} from '../use-sidebar-config'
import { useSidebarData } from '../use-sidebar-data'

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useAuthStore.getState().auth.reset()
})

function sidebarWrapper(admin?: object, user?: object, canConfigure = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(['status'], {
    SidebarModulesAdmin: admin ? JSON.stringify(admin) : '',
  })
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'alice',
    role: 1,
    permissions: { sidebar_settings: canConfigure },
    sidebar_modules: user ? JSON.stringify(user) : '',
  })
  function Wrapper(props: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {props.children}
      </QueryClientProvider>
    )
  }
  return Wrapper
}

function sidebarFor(admin?: object, user?: object, canConfigure = true) {
  return renderHook(() => useSidebarConfig(useSidebarData().navGroups), {
    wrapper: sidebarWrapper(admin, user, canConfigure),
  })
}

describe('security sidebar visibility', () => {
  it('old configurations show Security & Access immediately after Profile and keep API Keys', () => {
    const { result } = sidebarFor(
      { personal: { enabled: true, personal: true, topup: true } },
      { personal: { enabled: true, personal: true } }
    )
    expect(
      result.current
        .find((group) => group.id === 'personal')
        ?.items.map((item) => item.title)
    ).toEqual(['Wallet', 'Profile', 'Security & Access'])
    expect(
      result.current
        .flatMap((group) => group.items)
        .some((item) => item.title === 'API Keys')
    ).toBe(true)
  })
  it.each([
    [{ personal: { enabled: true, security: false } }, undefined, false],
    [{ personal: { enabled: false } }, { personal: { security: true } }, false],
    [undefined, { personal: { enabled: true, security: false } }, true],
    [undefined, { personal: { enabled: false } }, true],
  ])(
    'only admin rules determine Security & Access visibility (%j, %j → %s)',
    (admin, user, expected) => {
      const { result } = sidebarFor(admin, user)
      expect(
        result.current
          .flatMap((group) => group.items)
          .some((item) => item.title === 'Security & Access')
      ).toBe(expected)
    }
  )
  it('users without sidebar configuration permission retain the admin view', () => {
    const { result } = sidebarFor(
      undefined,
      { personal: { security: false } },
      false
    )
    expect(
      result.current
        .flatMap((group) => group.items)
        .some((item) => item.title === 'Security & Access')
    ).toBe(true)
  })
})

describe('audit log sidebar entry', () => {
  it('admin settings default Audit Logs to visible and preserve its independent toggle when saved', () => {
    const config = parseSidebarModulesAdmin(
      '{"console":{"enabled":true,"log":true}}'
    )
    expect(config.console.audit).toBe(true)
    config.console.audit = false
    const saved = parseSidebarModulesAdmin(serializeSidebarModulesAdmin(config))
    const { result } = sidebarFor(saved)
    const titles = result.current
      .flatMap((group) => group.items)
      .map((item) => item.title)
    expect(titles).not.toContain('Audit Logs')
    expect(titles).toContain('Usage Logs')
  })

  it('legacy configurations show a separate Audit Logs link immediately after Usage Logs', () => {
    const { result } = sidebarFor(
      { console: { enabled: true, log: true } },
      { console: { enabled: true, log: true } }
    )
    const items =
      result.current.find((group) => group.id === 'general')?.items ?? []
    const usageIndex = items.findIndex((item) => item.title === 'Usage Logs')
    expect(items[usageIndex + 1]).toMatchObject({
      title: 'Audit Logs',
      url: '/usage-logs/audit',
    })
    const selected = items.filter((item) =>
      checkIsActive('/usage-logs/audit', item)
    )
    expect(selected.map((item) => item.title)).toEqual(['Audit Logs'])
  })

  it.each([
    [{ console: { enabled: true, audit: false } }, undefined, false],
    [{ console: { enabled: false } }, { console: { audit: true } }, false],
    [undefined, { console: { enabled: true, audit: false } }, true],
    [undefined, { console: { enabled: false } }, true],
  ])(
    'only admin rules determine Audit Logs visibility (%j, %j → %s)',
    (admin, user, expected) => {
      const { result } = sidebarFor(admin, user)
      expect(
        result.current
          .flatMap((group) => group.items)
          .some((item) => item.title === 'Audit Logs')
      ).toBe(expected)
    }
  )

  it('hiding Usage Logs does not hide the independently configured Audit Logs entry', () => {
    const { result } = sidebarFor({ console: { enabled: true, log: false } })
    const titles = result.current
      .flatMap((group) => group.items)
      .map((item) => item.title)
    expect(titles).not.toContain('Usage Logs')
    expect(titles).toContain('Audit Logs')
  })
})

describe('retired personal sidebar preferences', () => {
  it.each([true, false])(
    'ignores historical chat and nested-link preferences when sidebar_settings permission is %s',
    (canConfigure) => {
      const groups: NavGroup[] = [
        {
          id: 'chat',
          title: 'Chat',
          items: [{ title: 'Chat presets', type: 'chat-presets' }],
        },
        {
          title: 'Account',
          items: [
            {
              title: 'Personal',
              items: [
                { title: 'Wallet', url: '/wallet' },
                { title: 'Profile', url: '/profile' },
              ],
            },
          ],
        },
      ]
      const { result } = renderHook(() => useSidebarConfig(groups), {
        wrapper: sidebarWrapper(
          undefined,
          {
            chat: { enabled: false, chat: false },
            personal: { enabled: false, topup: false, personal: false },
          },
          canConfigure
        ),
      })

      expect(result.current).toEqual(groups)
    }
  )

  it.each([
    { chat: { enabled: false, chat: true } },
    { chat: { enabled: true, chat: false } },
  ])('keeps chat presets hidden when the admin disables them (%j)', (admin) => {
    const groups: NavGroup[] = [
      {
        title: 'Chat',
        items: [{ title: 'Chat presets', type: 'chat-presets' }],
      },
    ]
    const { result } = renderHook(() => useSidebarConfig(groups), {
      wrapper: sidebarWrapper(admin, { chat: { enabled: true, chat: true } }),
    })

    expect(result.current).toEqual([])
  })

  it.each([
    [undefined, { personal: { enabled: false, topup: false } }, true],
    [
      { personal: { enabled: true, topup: false } },
      { personal: { enabled: true, topup: true } },
      false,
    ],
    [{ personal: { enabled: false } }, undefined, false],
  ])(
    'uses the same admin rules for wallet links outside the sidebar (%j, %j → %s)',
    (admin, user, expected) => {
      const { result } = renderHook(
        () => useIsSidebarModuleVisible('/wallet'),
        {
          wrapper: sidebarWrapper(admin, user),
        }
      )

      expect(result.current).toBe(expected)
    }
  )
})
