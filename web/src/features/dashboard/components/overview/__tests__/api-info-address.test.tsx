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
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { ApiInfoPanel } from '../api-info-panel'

let client: QueryClient
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
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
})

afterEach(() => {
  cleanup()
  client.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function renderPanel(urls: string[], enabled = true) {
  client.setQueryData(['status'], {
    api_info_enabled: enabled,
    api_info: urls.map((url, index) => ({
      url,
      route: `Route ${index + 1}`,
      description: 'API access',
      color: 'blue',
    })),
  })
  return render(
    <QueryClientProvider client={client}>
      <ApiInfoPanel />
    </QueryClientProvider>
  )
}

it('uses the Fluxion domain for display, copy, open and latency checks when status contains an IP', async () => {
  const user = userEvent.setup()
  const clipboard = vi.spyOn(navigator.clipboard, 'writeText')
  const fetch = vi.fn().mockResolvedValue(new Response())
  vi.stubGlobal('fetch', fetch)
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const expectedUrl = 'https://api.fluxion-sys.ai/v1'

  renderPanel(['http://192.0.2.10:3000/v1'])

  expect(screen.getByText(expectedUrl)).toBeInTheDocument()
  expect(screen.queryByText(/192\.0\.2\.10/)).not.toBeInTheDocument()
  expect(screen.getByTitle('Open in New Tab')).toHaveAttribute(
    'href',
    expectedUrl
  )
  await user.click(screen.getByRole('button', { name: 'Copy URL' }))
  expect(clipboard).toHaveBeenCalledWith(expectedUrl)
  await user.click(screen.getByTitle('Test Latency'))
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(expectedUrl, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
    })
  )
  await user.click(screen.getByTitle('External Speed Test'))
  expect(open).toHaveBeenCalledWith(
    `https://www.tcptest.cn/http/${encodeURIComponent(expectedUrl)}`,
    '_blank',
    'noopener,noreferrer'
  )
})

it.each([
  [
    'http://[2001:db8::1]:3000/v1beta/models',
    'https://api.fluxion-sys.ai/v1beta/models',
  ],
  ['http://192.0.2.10:3000/', 'https://api.fluxion-sys.ai'],
  ['not a URL', 'https://api.fluxion-sys.ai'],
])(
  'normalizes API route %s while preserving its protocol path',
  (url, expectedUrl) => {
    renderPanel([url])
    expect(screen.getByText(expectedUrl)).toBeInTheDocument()
    expect(screen.getByTitle('Open in New Tab')).toHaveAttribute(
      'href',
      expectedUrl
    )
  }
)

it('keeps all route entries when different IPs normalize to the same API domain', () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  renderPanel(['http://192.0.2.10:3000/v1', 'http://192.0.2.11:3000/v1'])
  expect(screen.getByText('Route 1')).toBeInTheDocument()
  expect(screen.getByText('Route 2')).toBeInTheDocument()
  expect(screen.getAllByText('https://api.fluxion-sys.ai/v1')).toHaveLength(2)
  expect(errors).not.toHaveBeenCalled()
})

it.each([
  { urls: [], enabled: true },
  { urls: ['http://192.0.2.10:3000/v1'], enabled: false },
])(
  'does not invent API routes when the list is empty or disabled ($enabled)',
  ({ urls, enabled }) => {
    renderPanel(urls, enabled)
    expect(screen.getByText('No API routes configured')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Copy URL' })
    ).not.toBeInTheDocument()
  }
)
