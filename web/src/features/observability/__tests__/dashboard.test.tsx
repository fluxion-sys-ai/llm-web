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
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { AxiosError, type AxiosAdapter } from 'axios'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSidebarData } from '@/hooks/use-sidebar-data'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { Observability } from '..'

const originalAdapter = api.defaults.adapter
const dashboardUrl = '/api/observability/grafana/d/fluxion-overview'
let client: QueryClient
let availability: { enabled: boolean; dashboard_enabled?: boolean }
let configStatus: number
let sessionUrl: string
let sessionFails: boolean
let sessionPending: boolean
let sessionExpires: number
let configRequests: number
let sessionRequests: number

function setUser(role: number) {
  useAuthStore.getState().auth.setBundle({
    access_token: 'test-access',
    token_type: 'Bearer',
    access_expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 1, username: 'test-user', role },
    session: {
      sid: 'test-session',
      current: true,
      login_method: 'password',
      ip: '',
      user_agent: '',
      created_at: 1,
      last_active_at: 1,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    },
  })
}

function Wrapper(props: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>{props.children}</QueryClientProvider>
  )
}

beforeEach(() => {
  availability = { enabled: true, dashboard_enabled: true }
  configStatus = 200
  sessionUrl = dashboardUrl
  sessionFails = false
  sessionPending = false
  sessionExpires = 300
  configRequests = 0
  sessionRequests = 0
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  setUser(10)
  const adapter: AxiosAdapter = async (config) => {
    if (config.url === '/api/observability') {
      configRequests++
      return {
        status: configStatus,
        statusText: '',
        headers: {},
        config,
        data: { success: true, data: availability },
      }
    }
    if (config.url === '/api/observability/session') {
      sessionRequests++
      expect(config.method).toBe('post')
      expect(config.headers.Authorization).toBe('Bearer test-access')
      if (sessionPending) return new Promise(() => {})
      if (sessionFails) {
        throw new AxiosError('Dashboard unavailable', 'ERR_NETWORK', config)
      }
      return {
        status: 200,
        statusText: '',
        headers: {},
        config,
        data: {
          success: true,
          data: {
            url: sessionUrl,
            expires_at: Math.floor(Date.now() / 1000) + sessionExpires,
          },
        },
      }
    }
    throw new Error(`Unexpected API request: ${config.url}`)
  }
  api.defaults.adapter = adapter
})

afterEach(() => {
  cleanup()
  client.clear()
  useAuthStore.getState().auth.reset()
  api.defaults.adapter = originalAdapter
  vi.useRealTimers()
})

function hasEntry(groups: ReturnType<typeof useSidebarData>) {
  return groups.navGroups
    .flatMap((group) => group.items)
    .some((item) => item.url === '/observability')
}

describe('Observability navigation and session', () => {
  it.each([10, 100])(
    'shows the administrator entry for role %s after server capability discovery',
    async (role) => {
      setUser(role)
      const { result } = renderHook(useSidebarData, { wrapper: Wrapper })
      expect(hasEntry(result.current)).toBe(false)
      await waitFor(() => expect(hasEntry(result.current)).toBe(true))
    }
  )

  it('never requests monitoring configuration or exposes its entry to a normal user', async () => {
    setUser(1)
    const { result } = renderHook(useSidebarData, { wrapper: Wrapper })
    await act(async () => {})
    expect(hasEntry(result.current)).toBe(false)
    expect(configRequests).toBe(0)
    expect(sessionRequests).toBe(0)
  })

  it.each(['disabled', 'old backend', 'missing dashboard capability'])(
    'hides the entry when %s',
    async (condition) => {
      if (condition === 'disabled') availability.enabled = false
      if (condition === 'old backend') configStatus = 404
      if (condition === 'missing dashboard capability') {
        availability.dashboard_enabled = undefined
      }
      const { result } = renderHook(useSidebarData, { wrapper: Wrapper })
      await waitFor(() =>
        expect(
          client.getQueryState(['observability', 1, 10, 'test-session'])?.status
        ).toBe('success')
      )
      expect(hasEntry(result.current)).toBe(false)
      expect(sessionRequests).toBe(0)
    }
  )

  it('loads the protected dashboard only after an authenticated session succeeds', async () => {
    render(<Observability />, { wrapper: Wrapper })
    expect(screen.queryByTitle('Observability')).not.toBeInTheDocument()
    const frame = await screen.findByTitle('Observability')
    expect(frame).toHaveAttribute('src', dashboardUrl)
    expect(
      screen.getByRole('link', { name: 'Open in new tab' })
    ).toHaveAttribute('href', '/observability')
    expect(sessionRequests).toBe(1)
  })

  it('shows an actionable retry state after a session failure and loads on retry', async () => {
    sessionFails = true
    render(<Observability />, { wrapper: Wrapper })
    await screen.findByText('Unable to open dashboard')
    expect(screen.queryByTitle('Observability')).not.toBeInTheDocument()
    sessionFails = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByTitle('Observability')).toHaveAttribute(
      'src',
      dashboardUrl
    )
  })

  it.each(['https://example.com/d/fluxion-overview', '/api/user/self'])(
    'does not embed an unsafe session URL %s',
    async (url) => {
      sessionUrl = url
      render(<Observability />, { wrapper: Wrapper })
      await screen.findByText('Unable to open dashboard')
      expect(screen.queryByTitle('Observability')).not.toBeInTheDocument()
    }
  )

  it('rejects already expired grants instead of showing a dashboard', async () => {
    sessionExpires = -1
    render(<Observability />, { wrapper: Wrapper })
    await screen.findByText('Unable to open dashboard')
    expect(screen.queryByTitle('Observability')).not.toBeInTheDocument()
  })

  it('renews before the five-minute grant expires and removes the frame if renewal fails', async () => {
    render(<Observability />, { wrapper: Wrapper })
    await screen.findByTitle('Observability')
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 1000)
    // Trigger a fresh grant with fake time so its renewal timer is controlled.
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(1)
    })
    const beforeRenewal = sessionRequests
    sessionFails = true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(270_001)
    })
    expect(sessionRequests).toBeGreaterThan(beforeRenewal)
    expect(screen.getByText('Unable to open dashboard')).toBeInTheDocument()
    expect(screen.queryByTitle('Observability')).not.toBeInTheDocument()
  })

  it('hides the dashboard when the grant expires while renewal is still pending', async () => {
    render(<Observability />, { wrapper: Wrapper })
    await screen.findByTitle('Observability')
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 1000)
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(1)
    })
    sessionPending = true
    const beforeRenewal = sessionRequests
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300_001)
    })
    expect(sessionRequests).toBe(beforeRenewal + 1)
    expect(screen.queryByTitle('Observability')).not.toBeInTheDocument()
    expect(screen.getByText('Unable to open dashboard')).toBeInTheDocument()
  })

  it('refreshes access on focus, clears the frame on logout and cleans up focus listeners', async () => {
    const view = render(<Observability />, { wrapper: Wrapper })
    await screen.findByTitle('Observability')
    window.dispatchEvent(new Event('focus'))
    await waitFor(() => expect(sessionRequests).toBe(2))
    act(() => useAuthStore.getState().auth.reset())
    expect(screen.queryByTitle('Observability')).not.toBeInTheDocument()
    view.unmount()
    window.dispatchEvent(new Event('focus'))
    await act(async () => {})
    expect(sessionRequests).toBe(2)
  })
})
