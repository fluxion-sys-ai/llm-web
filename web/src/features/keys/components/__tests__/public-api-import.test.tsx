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
import { createTable, getCoreRowModel } from '@tanstack/react-table'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { ApiKeysProvider } from '../api-keys-provider'
import { DataTableRowActions } from '../data-table-row-actions'
import { CCSwitchDialog } from '../dialogs/cc-switch-dialog'

const clients: QueryClient[] = []
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  localStorage.clear()
  vi.unstubAllEnvs()
})

test.each([
  ['Codex', 'http://203.0.113.10:3000/v1', 'https://api.fluxion-sys.ai/v1'],
  ['Codex', '', 'https://api.fluxion-sys.ai/v1'],
  ['Claude', '', 'https://api.fluxion-sys.ai'],
  ['Gemini', '', 'https://api.fluxion-sys.ai'],
])(
  '%s import uses the Fluxion endpoint despite old environment %s and stored IP',
  async (app, configuredBase, expectedEndpoint) => {
    vi.stubEnv('VITE_LLM_API_BASE_URL', configuredBase)
    localStorage.setItem(
      'status',
      JSON.stringify({ server_address: 'http://203.0.113.20:3000' })
    )
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: ['DeepSeek-V4.1-Flash'] },
    })
    const openWindow = vi.spyOn(window, 'open').mockReturnValue(null)
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    clients.push(client)
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={client}>
        <CCSwitchDialog
          open
          onOpenChange={() => undefined}
          tokenKey='demo-key'
        />
      </QueryClientProvider>
    )

    await user.click(screen.getByRole('radio', { name: app }))
    await user.click(
      screen.getAllByPlaceholderText('Select or enter model name')[0]
    )
    await user.click(
      await screen.findByRole('option', { name: 'DeepSeek-V4.1-Flash' })
    )
    await user.click(screen.getByRole('button', { name: 'Open CC Switch' }))

    expect(openWindow).toHaveBeenCalledOnce()
    const address = new URL(String(openWindow.mock.calls[0][0]))
    expect(address.protocol).toBe('ccswitch:')
    expect(address.searchParams.get('endpoint')).toBe(expectedEndpoint)
    expect(address.searchParams.get('homepage')).toBe(
      'https://api.fluxion-sys.ai'
    )
    expect(address.searchParams.get('model')).toBe('DeepSeek-V4.1-Flash')
  }
)

test('copying connection info uses the Fluxion domain despite a stored backend IP', async () => {
  localStorage.setItem(
    'status',
    JSON.stringify({ server_address: 'http://203.0.113.20:3000' })
  )
  vi.spyOn(api, 'post').mockResolvedValue({
    data: { success: true, data: { key: 'demo-key' } },
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  clients.push(client)
  client.setQueryData(['status'], {})
  const table = createTable({
    data: [
      {
        id: 1,
        name: 'Demo key',
        key: 'masked-key',
        status: 1,
        remain_quota: 0,
        used_quota: 0,
        unlimited_quota: true,
        expired_time: -1,
        created_time: 0,
        accessed_time: 0,
        model_limits_enabled: false,
      },
    ],
    columns: [],
    getCoreRowModel: getCoreRowModel(),
    state: {},
    onStateChange: () => undefined,
    renderFallbackValue: null,
  })
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  render(
    <QueryClientProvider client={client}>
      <ApiKeysProvider>
        <DataTableRowActions row={table.getRowModel().rows[0]} />
      </ApiKeysProvider>
    </QueryClientProvider>
  )

  await user.click(screen.getByRole('button', { name: 'Open menu' }))
  await user.click(
    screen.getByRole('menuitem', { name: 'Copy Connection Info' })
  )

  await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
  expect(JSON.parse(writeText.mock.calls[0][0])).toEqual({
    _type: 'newapi_channel_conn',
    key: 'sk-demo-key',
    url: 'https://api.fluxion-sys.ai',
  })
})
