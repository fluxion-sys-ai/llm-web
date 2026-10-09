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
} from '@tanstack/react-router'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { gpuCatalog } from '@/features/gpu/data'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'

import { GpuNavMenu } from '../components/gpu-nav-menu'
import { ModelsNavMenu } from '../components/models-nav-menu'
import { ResourcesNavMenu } from '../components/resources-nav-menu'
import { TopNav } from '../components/top-nav'

const site = vi.hoisted(() => ({ status: {} as Record<string, unknown> }))

const pricing = vi.hoisted(() => ({
  models: [
    {
      model_name: 'catalog-test-model',
      display_name: 'Catalog test model',
      vendor_name: 'Test vendor',
      featured: true,
    },
  ],
  isLoading: false,
  error: null as Error | null,
  refetch: vi.fn(),
}))

vi.mock('@/features/pricing/hooks/use-pricing-data', () => ({
  usePricingData: vi.fn(() => pricing),
}))
vi.mock('@/lib/lobe-icon', () => ({ getLobeIcon: () => null }))
vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: site.status }),
}))

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  pricing.isLoading = false
  pricing.error = null
  site.status = {}
})

afterEach(cleanup)

async function renderNavigation(menu: ReactNode, initialPath = '/') {
  const root = createRootRoute({
    component: () => (
      <>
        {menu}
        <Outlet />
      </>
    ),
  })
  const home = createRoute({ getParentRoute: () => root, path: '/' })
  const gpu = createRoute({
    getParentRoute: () => root,
    path: '/gpu',
    validateSearch: (search: Record<string, unknown>) => ({
      gpu: typeof search.gpu === 'string' ? search.gpu : undefined,
    }),
    component: () => <h1>GPU destination</h1>,
  })
  const pricingRoute = createRoute({
    getParentRoute: () => root,
    path: '/pricing',
    component: () => <h1>Models destination</h1>,
  })
  const model = createRoute({
    getParentRoute: () => root,
    path: '/pricing/$modelId',
    component: () => <h1>Model destination</h1>,
  })
  const additionalRoutes = ['/pricing/overview', '/blog', '/docs'].map((path) =>
    createRoute({
      getParentRoute: () => root,
      path,
      component: () => <h1>{path}</h1>,
    })
  )
  const router = createRouter({
    routeTree: root.addChildren([
      home,
      gpu,
      pricingRoute,
      model,
      ...additionalRoutes,
    ]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
  return router
}

describe('catalog navigation menus', () => {
  it('opens the GPU catalog and navigates to a selected GPU without retaining the dropdown', async () => {
    const user = userEvent.setup()
    const router = await renderNavigation(<GpuNavMenu />)
    const trigger = screen.getByRole('button', { name: 'GPU' })

    await user.click(trigger)

    expect(screen.getByRole('link', { name: 'All GPUs' })).toHaveAttribute(
      'href',
      '/gpu'
    )
    for (const gpu of gpuCatalog) {
      expect(
        screen.getByRole('link', {
          name: (name) =>
            name.startsWith(gpu.name) &&
            name.includes(`${gpu.vendor} · ${gpu.vramGb} GB`),
        })
      ).toHaveAttribute('href', `/gpu?gpu=${gpu.id}`)
    }
    await user.click(
      screen.getByRole('link', { name: /B300\s*NVIDIA · 288 GB/ })
    )

    expect(
      await screen.findByRole('heading', { name: 'GPU destination' })
    ).toBeVisible()
    expect(router.state.location.search).toEqual({ gpu: 'b300' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('supports keyboard expansion and navigation in the mobile GPU menu', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const router = await renderNavigation(
      <GpuNavMenu mobile onNavigate={onNavigate} />
    )

    await user.tab()
    expect(screen.getByRole('button', { name: 'GPU' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.tab()
    expect(screen.getByRole('link', { name: 'All GPUs' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(
      await screen.findByRole('heading', { name: 'GPU destination' })
    ).toBeVisible()
    expect(router.state.location.search).toEqual({ gpu: undefined })
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'GPU' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('retains lazy model loading and existing model detail links through the shared shell', async () => {
    const user = userEvent.setup()
    await renderNavigation(<ModelsNavMenu />)
    expect(usePricingData).toHaveBeenLastCalledWith(false)

    await user.click(screen.getByRole('button', { name: 'Models' }))

    expect(usePricingData).toHaveBeenLastCalledWith(true)
    expect(
      screen.getByRole('link', { name: /All Models\s*Models & Pricing/ })
    ).toHaveAttribute('href', '/pricing')
    await user.click(
      screen.getByRole('link', { name: /Catalog test model\s*Test vendor/ })
    )
    expect(
      await screen.findByRole('heading', { name: 'Model destination' })
    ).toBeVisible()
    expect(usePricingData).toHaveBeenLastCalledWith(false)
  })

  it('preserves the model error retry action', async () => {
    pricing.error = new Error('Offline')
    const user = userEvent.setup()
    await renderNavigation(<ModelsNavMenu mobile />)
    await user.click(screen.getByRole('button', { name: 'Models' }))
    expect(screen.getByText('Failed to load models')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(pricing.refetch).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['authentication required', { requiresAuth: true }],
    ['disabled', { disabled: true }],
    ['external', { external: true }],
  ] as const)(
    'keeps %s GPU links on the original TopNav link path',
    async (_label, flags) => {
      await renderNavigation(
        <TopNav links={[{ title: 'GPU', href: '/gpu', ...flags }]} />
      )
      expect(
        screen.queryByRole('button', { name: 'GPU' })
      ).not.toBeInTheDocument()
      const link = screen.getByText('GPU')
      if ('disabled' in flags) {
        expect(link).toHaveAttribute('aria-disabled', 'true')
      } else {
        expect(link).toHaveAttribute('href', '/gpu')
      }
    }
  )

  it('keeps disabled external destinations inert in the mobile navigation', async () => {
    const user = userEvent.setup()
    await renderNavigation(
      <TopNav
        links={[
          {
            title: 'External catalog',
            href: 'https://example.com/gpu',
            external: true,
            disabled: true,
          },
        ]}
      />
    )
    const trigger = screen.getByRole('button', {
      name: 'Toggle navigation menu',
    })
    await user.click(trigger)
    const navigation = screen.getByRole('navigation', { name: 'Navigation' })
    const link = within(navigation).getByRole('link', {
      name: 'External catalog',
    })

    expect(link).toHaveAttribute('aria-disabled', 'true')
    expect(link).toHaveAttribute('tabindex', '-1')
    expect(fireEvent.click(link)).toBe(false)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('opens the GPU submenu inside TopNav on mobile and closes the navigation after selection', async () => {
    const user = userEvent.setup()
    const router = await renderNavigation(
      <TopNav links={[{ title: 'GPU', href: '/gpu' }]} />
    )
    await user.click(
      screen.getByRole('button', { name: 'Toggle navigation menu' })
    )
    const navigation = screen.getByRole('navigation', { name: 'Navigation' })
    await user.click(within(navigation).getByRole('button', { name: 'GPU' }))
    await user.click(
      within(navigation).getByRole('link', { name: /H100\s*NVIDIA · 80 GB/ })
    )

    expect(
      await screen.findByRole('heading', { name: 'GPU destination' })
    ).toBeVisible()
    expect(router.state.location.search).toEqual({ gpu: 'h100' })
    expect(
      screen.getByRole('button', { name: 'Toggle navigation menu' })
    ).toHaveAttribute('aria-expanded', 'false')
  })
  it('opens Resources with internal Blog and Docs links and ignores the legacy external docs URL', async () => {
    site.status = { docs_link: 'https://docs.newapi.ai' }
    const user = userEvent.setup()
    await renderNavigation(<ResourcesNavMenu />)
    await user.click(screen.getByRole('button', { name: 'Resources' }))

    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute(
      'href',
      '/blog'
    )
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'href',
      '/docs'
    )
  })

  it('keeps Blog in Resources while a disabled documentation module hides only Docs', async () => {
    site.status = { HeaderNavModules: JSON.stringify({ docs: false }) }
    const user = userEvent.setup()
    await renderNavigation(<ResourcesNavMenu />)
    await user.click(screen.getByRole('button', { name: 'Resources' }))

    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute(
      'href',
      '/blog'
    )
    expect(screen.queryByRole('link', { name: 'Docs' })).not.toBeInTheDocument()
  })

  it('supports keyboard navigation to Docs and closes the mobile Resources menu', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    await renderNavigation(<ResourcesNavMenu mobile onNavigate={onNavigate} />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Resources' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.tab()
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('heading', { name: '/docs' })).toBeVisible()
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Resources' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('closes the mobile TopNav after a Resources link is selected', async () => {
    const user = userEvent.setup()
    await renderNavigation(
      <TopNav links={[{ title: 'Resources', href: '/blog' }]} />
    )
    const trigger = screen.getByRole('button', {
      name: 'Toggle navigation menu',
    })
    await user.click(trigger)
    const navigation = screen.getByRole('navigation', { name: 'Navigation' })
    await user.click(
      within(navigation).getByRole('button', { name: 'Resources' })
    )
    await user.click(within(navigation).getByRole('link', { name: 'Blog' }))

    expect(await screen.findByRole('heading', { name: '/blog' })).toBeVisible()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it.each([
    ['/pricing/overview', 'Pricing'],
    ['/pricing/catalog-test-model', 'Models'],
    ['/blog', 'Resources'],
    ['/docs', 'Resources'],
  ])(
    'marks only %s in its current top-level section %s',
    async (path, currentSection) => {
      await renderNavigation(
        <TopNav
          links={[
            { title: 'Models & Pricing', href: '/pricing' },
            { title: 'Pricing', href: '/pricing/overview' },
            { title: 'Resources', href: '/blog' },
          ]}
        />,
        path
      )

      for (const section of ['Models', 'Pricing', 'Resources']) {
        const control = screen.getByRole(
          section === 'Pricing' ? 'link' : 'button',
          { name: section }
        )
        if (section === currentSection) {
          expect(control).toHaveAttribute('aria-current', 'page')
        } else {
          expect(control).not.toHaveAttribute('aria-current')
        }
      }
    }
  )
})
