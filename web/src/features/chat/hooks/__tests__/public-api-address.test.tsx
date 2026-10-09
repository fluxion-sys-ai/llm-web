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
import { afterEach, expect, test, vi } from 'vitest'

import { useChatPresets } from '../use-chat-presets'

const clients: QueryClient[] = []
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  vi.unstubAllEnvs()
})

test.each([
  ['https://llm.fluxion-sys.ai/v1', 'https://llm.fluxion-sys.ai'],
  ['', 'https://video.example.com'],
  ['javascript:alert(1)', 'https://video.example.com'],
])(
  'client imports use the public base %s and keep their existing address when unconfigured or invalid',
  (configuredBase, expected) => {
    vi.stubEnv('VITE_LLM_API_BASE_URL', configuredBase)
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    clients.push(client)
    client.setQueryData(['status'], {
      server_address: 'https://video.example.com',
    })
    const { result } = renderHook(() => useChatPresets(), {
      wrapper: (props: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
          {props.children}
        </QueryClientProvider>
      ),
    })

    expect(result.current.serverAddress).toBe(expected)
  }
)
