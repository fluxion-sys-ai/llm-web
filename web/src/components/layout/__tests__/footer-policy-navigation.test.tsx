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
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import {
  DataPolicy,
  DataProcessingAddendum,
  PrivacyPolicy,
  RefundPolicy,
  UserAgreement,
} from '@/features/legal'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { Footer } from '../components/footer'

const policies = [
  {
    label: 'Terms of Service',
    path: '/terms',
    title: 'Terms of Service',
    section: '1. What the Service is',
    component: UserAgreement,
  },
  {
    label: 'Privacy Policy',
    path: '/privacy',
    title: 'Privacy Policy',
    section: 'What we collect',
    component: PrivacyPolicy,
  },
  {
    label: 'Data Policy',
    path: '/data-policy',
    title: 'Data Policy',
    section: 'At a glance',
    component: DataPolicy,
  },
  {
    label: 'DPA',
    path: '/dpa',
    title: 'Data Processing Addendum',
    section: '1. Definitions',
    component: DataProcessingAddendum,
  },
  {
    label: 'Refund Policy',
    path: '/refunds',
    title: 'Refund Policy',
    section: '1. Prepaid credits',
    component: RefundPolicy,
  },
]
const clients: QueryClient[] = []

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  vi.spyOn(api, 'get').mockRejectedValue(new Error('Backend unavailable'))
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

async function renderFooter(
  options: {
    custom?: 'html' | 'columns'
    backendUnavailable?: boolean
  } = {}
) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
    },
  })
  clients.push(client)
  if (!options.backendUnavailable) {
    client.setQueryData(['status'], {
      user_agreement_enabled: false,
      privacy_policy_enabled: false,
      announcements_enabled: false,
    })
  }
  client.setQueryData(['notice'], { success: true, data: '' })
  for (const key of ['user-agreement', 'privacy-policy']) {
    client.setQueryData([key], {
      success: true,
      data: 'Shared video policy content',
    })
  }
  if (options.custom === 'html') {
    useSystemConfigStore.getState().setConfig({
      footerHtml: '<p>Custom company footer</p>',
    })
  }
  const columns =
    options.custom === 'columns'
      ? [
          {
            title: 'Support',
            links: [{ text: 'Documentation', href: '/docs' }],
          },
        ]
      : undefined
  const root = createRootRoute({ component: Outlet })
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <Footer columns={columns} />,
  })
  const pages = policies.map((policy) =>
    createRoute({
      getParentRoute: () => root,
      path: policy.path,
      component: policy.component,
    })
  )
  const router = createRouter({
    routeTree: root.addChildren([home, ...pages]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return router
}

it('the default footer lists each policy once even when shared backend legal flags are disabled', async () => {
  await renderFooter()

  const footer = screen.getByRole('contentinfo')
  expect(within(footer).getByText('Company')).toBeVisible()
  const product = within(footer).getByText('Product').parentElement
  if (!product) throw new Error('Product section missing')
  expect(
    within(product)
      .getAllByRole('link')
      .map((link) => link.textContent)
  ).toEqual(['Models', 'GPU', 'Playground'])
  const company = within(footer).getByText('Company').parentElement
  if (!company) throw new Error('Company section missing')
  expect(within(company).getAllByRole('link')).toHaveLength(policies.length)
  expect(
    within(footer).queryByRole('link', { name: 'Blog' })
  ).not.toBeInTheDocument()
  expect(
    within(footer).getByRole('link', { name: 'llm.fluxion-sys.ai' })
  ).toHaveAttribute('href', 'https://llm.fluxion-sys.ai')
  for (const policy of policies) {
    const link = within(footer).getByRole('link', {
      name: policy.label,
    })
    expect(link).toBeVisible()
    expect(link).toHaveAttribute('href', policy.path)
  }
})

it.each(['html', 'columns'] as const)(
  'a custom %s footer retains all policy links',
  async (custom) => {
    await renderFooter({ custom })

    const footer = screen.getByRole('contentinfo')
    expect(
      within(footer).getByText(
        custom === 'html' ? 'Custom company footer' : 'Support'
      )
    ).toBeVisible()
    for (const policy of policies) {
      expect(
        within(footer).getByRole('link', { name: policy.label })
      ).toHaveAttribute('href', policy.path)
    }
  }
)

it.each(policies)(
  'the $label footer link opens the local policy while the backend is unavailable',
  async (policy) => {
    const user = userEvent.setup()
    const router = await renderFooter({ backendUnavailable: true })
    await user.click(
      within(screen.getByRole('contentinfo')).getByRole('link', {
        name: policy.label,
      })
    )

    expect(
      await screen.findByRole('heading', { name: policy.title, level: 1 })
    ).toBeVisible()
    const main = screen.getByRole('main')
    expect(
      within(main).getByRole('heading', { name: policy.section, level: 2 })
    ).toBeVisible()
    expect(main).not.toHaveTextContent('Shared video policy content')
    expect(main.querySelector('script')).toBeNull()
    expect(main.querySelector('header, footer')).toBeNull()
    expect(main.querySelector('a[href*="//llm.fluxion-sys.ai"]')).toBeNull()
    expect(router.state.location.pathname).toBe(policy.path)
    expect(screen.getAllByRole('banner')).toHaveLength(1)
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/status'))
  }
)

it('the supplied Data Policy retains its contents target, accessible comparison table, and local Terms links', async () => {
  const user = userEvent.setup()
  await renderFooter()
  await user.click(
    within(screen.getByRole('contentinfo')).getByRole('link', {
      name: 'Data Policy',
    })
  )

  const heading = await screen.findByRole('heading', {
    name: 'At a glance',
    level: 2,
  })
  const main = screen.getByRole('main')
  const contents = within(main).getByRole('navigation', { name: 'Contents' })
  expect(
    within(contents).getByRole('link', { name: 'At a glance' })
  ).toHaveAttribute('href', `#${heading.id}`)
  expect(heading).toHaveAttribute('id', 'at-a-glance')

  const table = within(main).getByRole('table')
  const storage = within(table).getByRole('row', {
    name: /Do you store prompts or outputs\?/,
  })
  expect(within(storage).getByRole('rowheader')).toHaveTextContent(
    'Do you store prompts or outputs?'
  )
  expect(within(storage).getByRole('cell')).toHaveTextContent('up to 30 days')
  for (const link of within(main).getAllByRole('link', { name: 'Terms' })) {
    expect(link).toHaveAttribute('href', '/terms')
  }
})
