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

import { useLlmCatalog } from '@/features/pricing/hooks/use-llm-catalog'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'

import { ModelsNavMenu } from '../components/models-nav-menu'
import { TopNav } from '../components/top-nav'

const site = vi.hoisted(() => ({ status: {} as Record<string, unknown> }))

const pricing = vi.hoisted(() => ({
  models: [
    {
      model_name: 'catalog-test-model',
      display_name: 'Catalog test model',
      vendor_name: 'Test vendor',
      featured: true,
      availability: undefined as 'coming_soon' | undefined,
    },
  ],
  isLoading: false,
  error: null as Error | null,
  refetch: vi.fn(),
}))

vi.mock('@/features/pricing/hooks/use-llm-catalog', () => ({
  useLlmCatalog: vi.fn(() => pricing),
}))
vi.mock('@/lib/lobe-icon', () => ({ getLobeIcon: () => null }))
vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: site.status }),
}))

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  pricing.isLoading = false
  pricing.error = null
  pricing.models[0].availability = undefined
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
  const additionalRoutes = [
    '/pricing/overview',
    '/blog',
    '/docs',
    '/blog/release',
    '/docs/quickstart',
  ].map((path) =>
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

function ConfiguredTopNav() {
  return <TopNav links={useTopNavLinks()} />
}

describe('catalog navigation menus', () => {
  it('opens the GPU catalog directly from the desktop GPU tab without a dropdown', async () => {
    const user = userEvent.setup()
    const router = await renderNavigation(
      <TopNav links={[{ title: 'GPU', href: '/gpu' }]} />
    )
    const link = screen.getByRole('link', { name: 'GPU' })

    expect(link).toHaveAttribute('href', '/gpu')
    expect(
      screen.queryByRole('button', { name: 'GPU' })
    ).not.toBeInTheDocument()
    await user.click(link)

    expect(
      await screen.findByRole('heading', { name: 'GPU destination' })
    ).toBeVisible()
    expect(router.state.location.search).toEqual({ gpu: undefined })
    expect(link).toHaveAttribute('aria-current', 'page')
  })

  it.each(['mouse', 'keyboard'])(
    'opens GPU directly and closes the mobile navigation when selected by %s',
    async (input) => {
      const user = userEvent.setup()
      const router = await renderNavigation(
        <TopNav links={[{ title: 'GPU', href: '/gpu' }]} />
      )
      const trigger = screen.getByRole('button', {
        name: 'Toggle navigation menu',
      })
      await user.click(trigger)
      const navigation = screen.getByRole('navigation', { name: 'Navigation' })
      const link = within(navigation).getByRole('link', { name: 'GPU' })
      expect(
        within(navigation).queryByRole('button', { name: 'GPU' })
      ).not.toBeInTheDocument()

      if (input === 'keyboard') {
        link.focus()
        await user.keyboard('{Enter}')
      } else {
        await user.click(link)
      }

      expect(
        await screen.findByRole('heading', { name: 'GPU destination' })
      ).toBeVisible()
      expect(router.state.location.search).toEqual({ gpu: undefined })
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    }
  )

  it('retains lazy model loading and existing model detail links through the shared shell', async () => {
    const user = userEvent.setup()
    await renderNavigation(<ModelsNavMenu />)
    expect(useLlmCatalog).toHaveBeenLastCalledWith(false)

    await user.click(screen.getByRole('button', { name: 'Models' }))

    expect(useLlmCatalog).toHaveBeenLastCalledWith(true)
    expect(
      screen.getByRole('link', { name: /All Models\s*Models & Pricing/ })
    ).toHaveAttribute('href', '/pricing')
    await user.click(
      screen.getByRole('link', { name: /Catalog test model\s*Test vendor/ })
    )
    expect(
      await screen.findByRole('heading', { name: 'Model destination' })
    ).toBeVisible()
    expect(useLlmCatalog).toHaveBeenLastCalledWith(false)
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

  it.each([false, true])(
    'labels upcoming models while preserving detail navigation when mobile is %s',
    async (mobile) => {
      pricing.models[0].availability = 'coming_soon'
      const user = userEvent.setup()
      await renderNavigation(<ModelsNavMenu mobile={mobile} />)
      await user.click(screen.getByRole('button', { name: 'Models' }))

      const modelLink = screen.getByRole('link', {
        name: /Catalog test model/,
      })
      expect(within(modelLink).getByText('Coming soon')).toBeVisible()
      expect(modelLink).toHaveAttribute('href', '/pricing/catalog-test-model')
      expect(
        within(screen.getByRole('link', { name: /All Models/ })).queryByText(
          'Coming soon'
        )
      ).not.toBeInTheDocument()

      await user.click(modelLink)

      expect(
        await screen.findByRole('heading', { name: 'Model destination' })
      ).toBeVisible()
      expect(screen.getByRole('button', { name: 'Models' })).toHaveAttribute(
        'aria-expanded',
        'false'
      )
    }
  )

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

  it('shows Blog and Docs as independent links without opening a Resources menu', async () => {
    site.status = { docs_link: 'https://docs.newapi.ai' }
    await renderNavigation(<ConfiguredTopNav />)

    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute(
      'href',
      '/blog'
    )
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'href',
      '/docs'
    )
    expect(
      screen.queryByRole('button', { name: 'Resources' })
    ).not.toBeInTheDocument()
  })

  it('keeps Blog while a disabled documentation module hides Docs from desktop and mobile', async () => {
    site.status = { HeaderNavModules: JSON.stringify({ docs: false }) }
    const user = userEvent.setup()
    await renderNavigation(<ConfiguredTopNav />)

    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute(
      'href',
      '/blog'
    )
    expect(screen.queryByRole('link', { name: 'Docs' })).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Toggle navigation menu' })
    )
    const navigation = screen.getByRole('navigation', { name: 'Navigation' })
    expect(
      within(navigation).getByRole('link', { name: 'Blog' })
    ).toHaveAttribute('href', '/blog')
    expect(
      within(navigation).queryByRole('link', { name: 'Docs' })
    ).not.toBeInTheDocument()
  })

  it.each(['Blog', 'Docs'])(
    'closes the mobile TopNav after selecting the direct %s link with a keyboard',
    async (label) => {
      const user = userEvent.setup()
      await renderNavigation(
        <TopNav
          links={[
            { title: 'Blog', href: '/blog' },
            { title: 'Docs', href: '/docs' },
          ]}
        />
      )
      const trigger = screen.getByRole('button', {
        name: 'Toggle navigation menu',
      })
      await user.click(trigger)
      const navigation = screen.getByRole('navigation', { name: 'Navigation' })
      const link = within(navigation).getByRole('link', { name: label })
      link.focus()
      await user.keyboard('{Enter}')

      expect(
        await screen.findByRole('heading', { name: `/${label.toLowerCase()}` })
      ).toBeVisible()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    }
  )

  it.each([
    ['/pricing/overview', 'Pricing'],
    ['/gpu', 'GPU'],
    ['/pricing/catalog-test-model', 'Models'],
    ['/blog', 'Blog'],
    ['/blog/release', 'Blog'],
    ['/docs', 'Docs'],
    ['/docs/quickstart', 'Docs'],
  ])(
    'marks only %s in its current top-level section %s',
    async (path, currentSection) => {
      await renderNavigation(
        <TopNav
          links={[
            { title: 'Models', href: '/pricing' },
            { title: 'GPU', href: '/gpu' },
            { title: 'Pricing', href: '/pricing/overview' },
            { title: 'Blog', href: '/blog' },
            { title: 'Docs', href: '/docs' },
          ]}
        />,
        path
      )

      for (const section of ['Models', 'GPU', 'Pricing', 'Blog', 'Docs']) {
        const control = screen.getByRole(
          section === 'Models' ? 'button' : 'link',
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
