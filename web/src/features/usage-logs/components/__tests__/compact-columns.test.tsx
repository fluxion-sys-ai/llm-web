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
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { DataTableViewOptions, useDataTable } from '@/components/data-table'
import en from '@/i18n/locales/en.json'

import { usageLogSchema, type UsageLog } from '../../data/schema'
import { COMMON_LOG_COLUMN_VISIBILITY } from '../../lib/table-layout'
import { useCommonLogsColumns } from '../columns/common-logs-columns'
import { UsageLogsProvider, useUsageLogsContext } from '../usage-logs-provider'

vi.mock('@lobehub/icons', () => ({ Zhipu: undefined }))

const i18n = createInstance()
let client: QueryClient

function LogCell(props: {
  log: UsageLog
  columnId: string
  isAdmin?: boolean
}) {
  const { sensitiveVisible, setSensitiveVisible } = useUsageLogsContext()
  const table = useReactTable({
    data: [props.log],
    columns: useCommonLogsColumns(props.isAdmin ?? false, false),
    getCoreRowModel: getCoreRowModel(),
  })
  const cell = table
    .getRowModel()
    .rows[0].getAllCells()
    .find((entry) => entry.column.id === props.columnId)
  return (
    <>
      <button
        type='button'
        onClick={() => setSensitiveVisible(!sensitiveVisible)}
      >
        Toggle privacy
      </button>
      {cell && flexRender(cell.column.columnDef.cell, cell.getContext())}
    </>
  )
}

beforeEach(async () => {
  await i18n.init({
    lng: 'en',
    resources: { en },
    interpolation: { escapeValue: false },
  })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['status'], {}, { updatedAt: Date.now() + 60_000 })
  client.setQueryData(
    ['pricing'],
    { data: [], vendors: [] },
    { updatedAt: Date.now() + 60_000 }
  )
})
afterEach(() => client.clear())

function renderCell(log: Partial<UsageLog>, columnId: string, isAdmin = false) {
  const row = usageLogSchema.parse({
    id: 1,
    user_id: 1,
    created_at: 1792440000,
    type: 2,
    content: '',
    ...log,
  })
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <UsageLogsProvider>
          <LogCell log={row} columnId={columnId} isAdmin={isAdmin} />
        </UsageLogsProvider>
      </QueryClientProvider>
    </I18nextProvider>
  )
}

test('a top-up row displays its operation instead of an empty model cell', () => {
  renderCell({ type: 1, content: 'Credit added for account abc' }, 'model_name')
  expect(screen.getByText('Credit added for account abc')).toBeVisible()
})

test('privacy mode masks operation content instead of exposing account names', () => {
  renderCell({ type: 1, content: 'Credit added for account abc' }, 'model_name')
  fireEvent.click(screen.getByRole('button', { name: 'Toggle privacy' }))
  expect(
    screen.queryByText('Credit added for account abc')
  ).not.toBeInTheDocument()
  expect(screen.getByText('Top-up')).toBeVisible()
})

test('a failed request keeps the error visible without expanding technical columns', () => {
  renderCell(
    { type: 5, model_name: 'GLM-5.3', content: 'Upstream timed out' },
    'model_name'
  )
  expect(screen.getByText('Upstream timed out')).toBeVisible()
})

test('input and output token usage are explicitly labelled', () => {
  renderCell({ prompt_tokens: 1500, completion_tokens: 32 }, 'prompt_tokens')
  expect(screen.getByText('Input')).toBeVisible()
  expect(screen.getByText('Output')).toBeVisible()
  expect(screen.getByText('1,500')).toBeVisible()
  expect(screen.getByText('32')).toBeVisible()
})

test('the compact details action opens the recorded log content', async () => {
  renderCell({ type: 5, content: 'Upstream timed out' }, 'details')
  fireEvent.click(screen.getByRole('button', { name: 'View details' }))
  expect(await screen.findByRole('dialog')).toHaveTextContent(
    'Upstream timed out'
  )
})

function CompactTable(props: { isAdmin: boolean }) {
  const { table } = useDataTable({
    data: [],
    columns: useCommonLogsColumns(props.isAdmin, false),
    initialColumnVisibility: COMMON_LOG_COLUMN_VISIBILITY,
  })
  return (
    <>
      <DataTableViewOptions table={table} />
      <table>
        <thead>
          <tr>
            {table.getHeaderGroups()[0].headers.map((header) => (
              <th key={header.id}>
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
              </th>
            ))}
          </tr>
        </thead>
      </table>
    </>
  )
}

test.each([true, false])(
  'the default list keeps only activity columns for admin=%s',
  (isAdmin) => {
    render(
      <I18nextProvider i18n={i18n}>
        <CompactTable isAdmin={isAdmin} />
      </I18nextProvider>
    )
    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent)
    ).toEqual([
      'Time',
      ...(isAdmin ? ['User'] : []),
      'Model / operation',
      'Usage',
      'Cost',
      'Details',
    ])
  }
)

test('an administrator can restore the channel diagnostic column from View', async () => {
  render(
    <I18nextProvider i18n={i18n}>
      <CompactTable isAdmin />
    </I18nextProvider>
  )
  expect(
    screen.queryByRole('columnheader', { name: 'Channel' })
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'View' }))
  fireEvent.click(
    await screen.findByRole('menuitemcheckbox', { name: 'Channel' })
  )
  expect(screen.getByRole('columnheader', { name: 'Channel' })).toBeVisible()
})

test('nonrequest operations do not display zero token counts', () => {
  renderCell({ type: 1 }, 'prompt_tokens')
  expect(screen.queryByText('Input')).not.toBeInTheDocument()
  expect(screen.queryByText('Output')).not.toBeInTheDocument()
  expect(screen.queryByText('0')).not.toBeInTheDocument()
})

test.each([true, false])(
  'quota saturation stays visible only for admin=%s',
  (isAdmin) => {
    renderCell(
      {
        model_name: 'GLM-5.3',
        other: JSON.stringify({
          admin_info: {
            quota_saturation: {
              op: 'round',
              kind: 'overflow',
              original: 3e9,
              clamped: 2147483647,
            },
          },
        }),
      },
      'model_name',
      isAdmin
    )
    if (isAdmin) expect(screen.getByText('Quota clamped')).toBeVisible()
    else expect(screen.queryByText('Quota clamped')).not.toBeInTheDocument()
  }
)
