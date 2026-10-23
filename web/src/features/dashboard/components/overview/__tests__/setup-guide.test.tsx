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
  RouterProvider,
} from '@tanstack/react-router'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { OverviewDashboard } from '../overview-dashboard'

const storageKey = 'dashboard_overview_setup_guide_expanded'
let client: QueryClient
let keyLookupError: Error | null
let userModels: string[]
let catalogLookupError: Error | null
let catalogGate: Promise<void> | null
let comingSoonModels: string[]
const originalGetAnimations = Object.getOwnPropertyDescriptor(
  Element.prototype,
  'getAnimations'
)

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
})

afterAll(() => {
  if (originalGetAnimations) {
    Object.defineProperty(
      Element.prototype,
      'getAnimations',
      originalGetAnimations
    )
  } else {
    Reflect.deleteProperty(Element.prototype, 'getAnimations')
  }
})

beforeEach(() => {
  window.localStorage.clear()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'dashboard-user',
    role: 1,
    quota: 1000000,
    used_quota: 1000,
    request_count: 1,
  })
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  keyLookupError = null
  catalogLookupError = null
  catalogGate = null
  comingSoonModels = []
  userModels = ['DeepSeek-V4.1-Flash']
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    switch (url) {
      case '/api/token/?p=1&size=10':
        if (keyLookupError) throw keyLookupError
        return {
          data: {
            success: true,
            data: {
              items: [{ id: 1, name: 'App key', key: 'masked', status: 1 }],
            },
          },
        }
      case '/api/status':
        return {
          data: {
            data: {
              api_info_enabled: false,
              announcements_enabled: false,
              faq_enabled: false,
              uptime_kuma_enabled: false,
            },
          },
        }
      case '/api/user/models':
        return { data: { success: true, data: userModels } }
      case '/api/pricing':
        if (catalogGate) await catalogGate
        if (catalogLookupError) throw catalogLookupError
        return {
          data: {
            success: true,
            data: ['GLM-5.3', 'Seedance-2.0-Mini', 'DeepSeek-V4.1-Flash'].map(
              (model_name) => ({
                model_name,
                availability: comingSoonModels.includes(model_name)
                  ? 'coming_soon'
                  : undefined,
                supported_endpoint_types: ['openai'],
              })
            ),
          },
        }
      case '/api/data/self':
        return { data: { success: true, data: [] } }
      default:
        throw new Error(`Unexpected dashboard request: ${url}`)
    }
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  client.clear()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  window.localStorage.clear()
})

async function renderOverview() {
  const router = createRouter({
    routeTree: createRootRoute({ component: OverviewDashboard }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

describe('overview setup guide', () => {
  it('uses an authorized exact LLM ID when video models appear first in the shared backend', async () => {
    userModels = ['Seedance-2.0-Mini', 'DeepSeek-V4.1-Flash']
    window.localStorage.setItem(storageKey, 'expanded')
    await renderOverview()

    await waitFor(() =>
      expect(screen.getByText(/"model":"DeepSeek-V4\.1-Flash"/)).toBeVisible()
    )
    expect(screen.getByText('DeepSeek-V4.1-Flash')).toBeVisible()
    expect(screen.queryByText(/Seedance/)).not.toBeInTheDocument()
    expect(screen.queryByText(/"model":"GLM-5\.3"/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Copy ready-to-run curl' })
    ).toBeEnabled()
  })

  it('does not offer a runnable request when no authorized model exactly matches the LLM catalog', async () => {
    userModels = ['Seedance-2.0-Mini', 'deepseek-v4.1-flash']
    window.localStorage.setItem(storageKey, 'expanded')
    await renderOverview()

    await waitFor(() =>
      expect(screen.getAllByText('No available models')[0]).toBeVisible()
    )
    expect(screen.queryByText(/"model":/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Copy ready-to-run curl' })
    ).toBeDisabled()
  })

  it('does not offer a runnable request for coming-soon models despite authorized matching IDs', async () => {
    comingSoonModels = ['DeepSeek-V4.1-Flash']
    userModels = ['DeepSeek-V4.1-Flash', 'Kimi-K3']
    window.localStorage.setItem(storageKey, 'expanded')
    await renderOverview()

    await waitFor(() =>
      expect(screen.getAllByText('No available models')[0]).toBeVisible()
    )
    expect(screen.queryByText(/"model":/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Copy ready-to-run curl' })
    ).toBeDisabled()
  })

  it('does not reveal a key or offer a runnable request for an unavailable Flash catalog fallback', async () => {
    userModels = ['GLM-5.3-Flash']
    const revealKey = vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, data: { key: 'fixture-secret' } },
    })
    window.localStorage.setItem(storageKey, 'expanded')
    await renderOverview()

    await waitFor(() =>
      expect(screen.getAllByText('No available models')[0]).toBeVisible()
    )
    expect(screen.queryByText(/"model":/)).not.toBeInTheDocument()
    const copyButton = screen.getByRole('button', {
      name: 'Copy ready-to-run curl',
    })
    expect(copyButton).toBeDisabled()
    await userEvent.setup().click(copyButton)
    expect(revealKey).not.toHaveBeenCalled()
  })

  it('skips an unavailable Flash fallback and offers an authorized live model instead', async () => {
    userModels = ['GLM-5.3-Flash', 'DeepSeek-V4.1-Flash']
    window.localStorage.setItem(storageKey, 'expanded')
    await renderOverview()

    await waitFor(() =>
      expect(screen.getByText(/"model":"DeepSeek-V4\.1-Flash"/)).toBeVisible()
    )
    expect(
      screen.queryByText(/"model":"GLM-5\.3-Flash"/)
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Copy ready-to-run curl' })
    ).toBeEnabled()
  })

  it('does not invent a fallback model when the LLM catalog fails to load', async () => {
    catalogLookupError = new Error('Catalog unavailable')
    window.localStorage.setItem(storageKey, 'expanded')
    await renderOverview()

    await waitFor(() =>
      expect(screen.getAllByText('Unable to load models')[0]).toBeVisible()
    )
    expect(screen.queryByText(/"model":/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Copy ready-to-run curl' })
    ).toBeDisabled()
  })

  it('waits for the LLM catalog before offering an authorized request example', async () => {
    let releaseCatalog = () => {}
    catalogGate = new Promise<void>((resolve) => {
      releaseCatalog = resolve
    })
    window.localStorage.setItem(storageKey, 'expanded')
    await renderOverview()

    try {
      expect(
        await screen.findByRole('button', { name: 'Copy ready-to-run curl' })
      ).toBeDisabled()
      await waitFor(() =>
        expect(screen.getAllByText('Loading')[0]).toBeVisible()
      )
      expect(screen.queryByText(/"model":/)).not.toBeInTheDocument()
    } finally {
      await act(async () => releaseCatalog())
    }

    await waitFor(() =>
      expect(screen.getByText(/"model":"DeepSeek-V4\.1-Flash"/)).toBeVisible()
    )
    expect(
      screen.getByRole('button', { name: 'Copy ready-to-run curl' })
    ).toBeEnabled()
  })

  it('uses the Fluxion domain despite IP addresses in deployment and API info', async () => {
    vi.stubEnv('VITE_LLM_API_BASE_URL', 'http://192.0.2.20:3000/v1')
    client.setQueryData(['status'], {
      api_info_enabled: true,
      api_info: [{ url: 'http://192.0.2.10:3000/v1' }],
    })
    window.localStorage.setItem(storageKey, 'expanded')
    await renderOverview()

    await waitFor(() =>
      expect(
        screen.getByText(
          /curl https:\/\/api\.fluxion-sys\.ai\/v1\/chat\/completions/
        )
      ).toBeVisible()
    )
    expect(
      screen.queryByText(/curl http:\/\/192\.0\.2\./)
    ).not.toBeInTheDocument()
  })

  it('shows usage first and only a header entry when setup is complete', async () => {
    await renderOverview()

    const toggle = await screen.findByRole('button', { name: 'Setup guide' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.getAllByRole('heading').map((heading) => heading.textContent)
    ).toEqual(['Overview', 'Usage at a glance'])
    expect(screen.queryByText('Setup guide complete')).not.toBeInTheDocument()
    expect(screen.queryByText('Setup progress: 3/3')).not.toBeInTheDocument()
    for (const name of ['API Keys', 'Channels', 'Usage Logs', 'Pricing']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    const panel = document.getElementById(
      toggle.getAttribute('aria-controls') ?? ''
    )
    expect(panel).toBeInTheDocument()
    expect(panel).not.toBeVisible()
  })

  it('toggles the completed guide with the keyboard and restores focus after hiding it', async () => {
    const user = userEvent.setup()
    await renderOverview()
    const toggle = await screen.findByRole('button', { name: 'Setup guide' })

    await user.tab()
    expect(toggle).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      document.getElementById(toggle.getAttribute('aria-controls') ?? '')
    ).toBeVisible()
    await waitFor(() =>
      expect(
        screen.getByRole('heading', {
          name: 'Get started',
        })
      ).toBeVisible()
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^API Keys/ })).toBeVisible()
    )

    await user.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Hide setup guide' }))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
  })

  it('restores the completed guide preference after remounting', async () => {
    const user = userEvent.setup()
    const first = await renderOverview()
    await user.click(await screen.findByRole('button', { name: 'Setup guide' }))
    first.unmount()

    const second = await renderOverview()
    expect(
      await screen.findByRole('button', { name: 'Setup guide' })
    ).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('button', { name: 'Hide setup guide' }))
    second.unmount()

    await renderOverview()
    expect(
      await screen.findByRole('button', { name: 'Setup guide' })
    ).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Setup guide complete')).not.toBeInTheDocument()
  })

  it('keeps the existing progress banner when an incomplete guide is manually collapsed', async () => {
    const user = userEvent.setup()
    useAuthStore
      .getState()
      .auth.setUser({ id: 1, username: 'new-user', role: 1 })
    await renderOverview()

    await user.click(
      await screen.findByRole('button', { name: 'Hide setup guide' })
    )
    expect(screen.getByText('Setup progress: 1/3')).toBeVisible()
    expect(
      screen.getByText('Setup guide is collapsed. Expand it anytime.')
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'API Keys' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Setup guide' })
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show setup guide' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Hide setup guide' })
      ).toBeVisible()
    )
  })

  it('removes the collapsed progress banner when the remaining setup step completes', async () => {
    useAuthStore.getState().auth.setUser({
      id: 1,
      username: 'dashboard-user',
      role: 1,
      quota: 1000000,
    })
    window.localStorage.setItem(storageKey, 'collapsed')
    await renderOverview()
    expect(await screen.findByText('Setup progress: 2/3')).toBeVisible()

    act(() => {
      useAuthStore.getState().auth.setUser({
        id: 1,
        username: 'dashboard-user',
        role: 1,
        quota: 1000000,
        request_count: 1,
      })
    })
    expect(
      await screen.findByRole('button', { name: 'Setup guide' })
    ).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/Setup progress:/)).not.toBeInTheDocument()
  })

  it('does not show a completed setup entry when the key lookup fails', async () => {
    keyLookupError = new Error('Key lookup unavailable')
    await renderOverview()

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Hide setup guide' })
      ).toBeVisible()
    )
    expect(
      screen.queryByRole('button', { name: 'Setup guide' })
    ).not.toBeInTheDocument()
  })
})
