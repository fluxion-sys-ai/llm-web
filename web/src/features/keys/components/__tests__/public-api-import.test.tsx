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
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { CCSwitchDialog } from '../dialogs/cc-switch-dialog'

const clients: QueryClient[] = []
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  localStorage.clear()
  vi.unstubAllEnvs()
})

test.each([
  ['https://llm.fluxion-sys.ai/v1', 'https://llm.fluxion-sys.ai/v1'],
  ['', 'https://video.example.com/v1'],
])(
  'Codex import uses configured base %s or retains the existing server address',
  async (configuredBase, expectedEndpoint) => {
    vi.stubEnv('VITE_LLM_API_BASE_URL', configuredBase)
    localStorage.setItem(
      'status',
      JSON.stringify({ server_address: 'https://video.example.com' })
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

    await user.click(screen.getByRole('radio', { name: 'Codex' }))
    await user.click(screen.getByPlaceholderText('Select or enter model name'))
    await user.click(
      await screen.findByRole('option', { name: 'DeepSeek-V4.1-Flash' })
    )
    await user.click(screen.getByRole('button', { name: 'Open CC Switch' }))

    expect(openWindow).toHaveBeenCalledOnce()
    const address = new URL(String(openWindow.mock.calls[0][0]))
    expect(address.protocol).toBe('ccswitch:')
    expect(address.searchParams.get('endpoint')).toBe(expectedEndpoint)
    expect(address.searchParams.get('model')).toBe('DeepSeek-V4.1-Flash')
  }
)
