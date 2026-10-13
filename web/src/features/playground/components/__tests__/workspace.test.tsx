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
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { Playground } from '../../index'
import { saveMessages } from '../../lib'

let client: QueryClient

beforeEach(() => {
  localStorage.clear()
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
    },
  })
  client.setQueryData(['status'], {})
  client.setQueryData(['pricing'], {
    success: true,
    data: [
      {
        model_name: 'DeepSeek-V4.1-Flash',
        quota_type: 0,
        model_ratio: 1,
        completion_ratio: 1,
        enable_groups: ['default'],
        supported_endpoint_types: ['openai'],
        output_modalities: ['text'],
      },
    ],
    vendors: [],
    group_ratio: { default: 1 },
    usable_group: {},
    supported_endpoint: {},
    auto_groups: [],
  })
  client.setQueryData(
    ['playground-groups'],
    [{ label: 'Default', value: 'default', ratio: 1 }]
  )
  client.setQueryData(
    ['playground-models', 'default'],
    [{ label: 'DeepSeek Flash', value: 'DeepSeek-V4.1-Flash' }]
  )
  vi.spyOn(api, 'get').mockRejectedValue(new Error('Unexpected request'))
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(
    new Error('Inference is not part of this test')
  )
})

afterEach(() => {
  cleanup()
  client.clear()
  localStorage.clear()
  vi.unstubAllGlobals()
})

function renderWorkspace(width: number) {
  vi.stubGlobal('innerWidth', width)
  render(
    <QueryClientProvider client={client}>
      <Playground />
    </QueryClientProvider>
  )
}

describe('Playground workspace layout', () => {
  test.each([1024, 390])(
    'at %ipx an empty conversation keeps the introduction near the composer',
    async (width) => {
      renderWorkspace(width)
      await screen.findByRole('button', { name: 'Explain a concept' })
      const conversation = screen.getByRole('log')
      const scrollFrame = conversation.parentElement

      expect(scrollFrame).not.toHaveClass('flex-1')
      expect(scrollFrame?.parentElement).toHaveClass('justify-center')
      expect(conversation).not.toContainElement(
        screen.getByRole('textbox', { name: 'Ask anything' })
      )
      expect(
        screen.getByRole('heading', { name: 'Playground' })
      ).toBeInTheDocument()
    }
  )

  test.each([1024, 390])(
    'at %ipx restored history scrolls separately and clearing it restores the compact layout without losing the draft',
    async (width) => {
      saveMessages([
        {
          key: 'question',
          from: 'user',
          versions: [{ id: 'first', content: 'A saved conversation' }],
          status: 'complete',
        },
      ])
      const user = userEvent.setup()
      renderWorkspace(width)
      await screen.findByText('A saved conversation')
      const conversation = screen.getByRole('log')
      const input = screen.getByRole('textbox', { name: 'Ask anything' })

      expect(conversation.parentElement).toHaveClass(
        'min-h-0',
        'flex-1',
        'overflow-hidden'
      )
      expect(conversation).not.toContainElement(input)
      await user.type(input, 'Keep this draft')
      await user.click(
        screen.getByRole('button', { name: 'Clear chat history' })
      )
      await user.click(screen.getByRole('button', { name: 'Clear' }))

      await screen.findByRole('button', { name: 'Explain a concept' })
      await waitFor(() =>
        expect(
          screen.queryByText('A saved conversation')
        ).not.toBeInTheDocument()
      )
      expect(conversation.parentElement).not.toHaveClass('flex-1')
      expect(input).toHaveValue('Keep this draft')
      expect(globalThis.fetch).not.toHaveBeenCalled()
    }
  )
})
