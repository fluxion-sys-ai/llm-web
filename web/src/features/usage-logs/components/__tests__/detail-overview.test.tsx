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
import { render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'

import { usageLogSchema } from '../../data/schema'
import { DetailsDialog } from '../dialogs/details-dialog'

const clients: QueryClient[] = []
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear())
})

function renderDetails(isAdmin = true, sensitiveVisible = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  client.setQueryData(['status'], {}, { updatedAt: Date.now() + 60_000 })
  render(
    <QueryClientProvider client={client}>
      <DetailsDialog
        log={usageLogSchema.parse({
          id: 1,
          user_id: 7,
          username: 'demo-customer',
          created_at: Date.parse('2026-10-19T21:30:00Z') / 1000,
          type: 2,
          content: '',
          model_name: 'glm-5.3',
          token_name: 'demo-key',
          channel: 9,
          channel_name: 'demo-channel',
          group: 'demo-group',
          is_stream: true,
          use_time: 5,
          completion_tokens: 200,
          other: JSON.stringify({ frt: 500 }),
        })}
        isAdmin={isAdmin}
        isRoot={false}
        sensitiveVisible={sensitiveVisible}
        open
        onOpenChange={() => undefined}
      />
    </QueryClientProvider>
  )
}

it('retains timestamp, model and request diagnostics in details after compacting the table', () => {
  renderDetails()
  expect(screen.getByText('2026-10-19 14:30:00 PDT')).toBeVisible()
  expect(screen.getByText('glm-5.3')).toBeVisible()
  expect(screen.getByText('demo-customer (ID: 7)')).toBeVisible()
  expect(screen.getByText('demo-key')).toBeVisible()
  expect(screen.getByText('demo-group')).toBeVisible()
  expect(screen.getByText(/demo-channel/)).toBeVisible()
  expect(screen.getByText('40 t/s')).toBeVisible()
})

it('does not expose user and channel information in a self-view details dialog', () => {
  renderDetails(false)
  expect(screen.queryByText(/demo-customer/)).not.toBeInTheDocument()
  expect(screen.queryByText(/demo-channel/)).not.toBeInTheDocument()
})

it('keeps sensitive identifiers masked when details are opened with privacy enabled', () => {
  renderDetails(true, false)
  for (const text of [
    'demo-customer',
    'demo-key',
    'demo-group',
    'demo-channel',
  ]) {
    expect(screen.queryByText(new RegExp(text))).not.toBeInTheDocument()
  }
  expect(screen.getByText('2026-10-19 14:30:00 PDT')).toBeVisible()
})
