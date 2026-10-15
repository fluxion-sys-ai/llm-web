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
import { afterEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { ModelDetailsPerformance } from '../components/model-details-performance'

vi.mock('@visactor/react-vchart', () => ({ VChart: () => null }))

const clients: QueryClient[] = []
const point = {
  ts: 1770000000,
  avg_ttft_ms: 400,
  avg_latency_ms: 1200,
  avg_tps: 40,
  success_rate: 80,
}

type IncidentPoint = typeof point & {
  success_rate_available?: boolean
  service_incident?: boolean | null
  incident_classification_complete?: boolean
}

async function renderPerformance(
  seriesByGroup: IncidentPoint[][],
  summaryRate?: number
) {
  vi.spyOn(api, 'get').mockImplementation(async (url) => ({
    data: {
      success: true,
      data:
        url === '/api/perf-metrics/summary'
          ? {
              models: [
                {
                  model_name: 'GLM-5.3',
                  ...point,
                  success_rate:
                    summaryRate ??
                    seriesByGroup[0]?.[0]?.success_rate ??
                    point.success_rate,
                  success_rate_available:
                    seriesByGroup[0]?.[0]?.success_rate_available,
                  recent_success_series: seriesByGroup[0],
                },
              ],
            }
          : {
              model_name: 'GLM-5.3',
              groups: seriesByGroup.map((series, index) => ({
                ...point,
                group: `group-${index}`,
                success_rate: series[0]?.success_rate ?? point.success_rate,
                success_rate_available: series[0]?.success_rate_available,
                series,
              })),
            },
    },
  }))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  render(
    <QueryClientProvider client={client}>
      <ModelDetailsPerformance
        model={{
          id: 1,
          model_name: 'GLM-5.3',
          enable_groups: ['default'],
          quota_type: 0,
          model_ratio: 1,
          completion_ratio: 1,
        }}
      />
    </QueryClientProvider>
  )
  await screen.findByText('Success rate (last 24h)')
}

afterEach(() => {
  cleanup()
  clients.forEach((client) => client.clear())
  clients.length = 0
})

test('classified client failures are excluded from service success and are not incidents', async () => {
  await renderPerformance([
    [
      {
        ...point,
        success_rate: 100,
        success_rate_available: true,
        service_incident: false,
        incident_classification_complete: true,
      },
    ],
  ])

  expect(screen.getByText('100.00%')).toBeVisible()
  expect(
    screen.getByText('No service incidents in classified requests.')
  ).toBeVisible()
  expect(screen.getByText('Success rate (last 24h)')).toBeVisible()
  expect(
    screen.getByText('Excludes client errors and client cancellations.')
  ).toBeVisible()
  expect(screen.queryByText('Availability (last 24h)')).not.toBeInTheDocument()
  expect(screen.queryByText('Per-group performance')).not.toBeInTheDocument()
  expect(screen.queryByText('group-0')).not.toBeInTheDocument()
})

test('confirmed service failures in multiple groups count each time bucket once', async () => {
  const failure = {
    ...point,
    success_rate: 100,
    service_incident: true,
    incident_classification_complete: true,
  }
  await renderPerformance([
    [failure],
    [failure, { ...failure, ts: point.ts + 3600 }],
  ])

  expect(
    screen.getByText('Time buckets with confirmed service incidents: 2')
  ).toBeVisible()
  expect(screen.getByText('Each time bucket is counted once.')).toBeVisible()
  expect(
    screen.queryByText('No service incidents in classified requests.')
  ).not.toBeInTheDocument()
})

test.each([undefined, null, false])(
  'unavailable or incomplete classification %s stays unknown even when requests all succeeded',
  async (service_incident) => {
    await renderPerformance([
      [
        {
          ...point,
          success_rate: 100,
          service_incident,
          ...(service_incident === false
            ? { incident_classification_complete: false }
            : {}),
        },
      ],
    ])

    expect(screen.getByText('100.00%')).toBeVisible()
    expect(
      screen.getByText('Service-incident history is unavailable.')
    ).toBeVisible()
    expect(
      screen.queryByText('No service incidents in classified requests.')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('No incidents in the last 24 hours')
    ).not.toBeInTheDocument()
  }
)

test('a confirmed service failure is counted while incomplete historical classification remains disclosed', async () => {
  await renderPerformance([
    [
      {
        ...point,
        service_incident: true,
        incident_classification_complete: false,
      },
      { ...point, ts: point.ts + 3600, service_incident: null },
    ],
  ])

  expect(
    screen.getByText('Time buckets with confirmed service incidents: 1')
  ).toBeVisible()
  expect(
    screen.getByText('Incident classification is incomplete for this period.')
  ).toBeVisible()
})

test('all excluded requests show unavailable success rate and no chart sample', async () => {
  await renderPerformance([
    [
      {
        ...point,
        success_rate: 0,
        success_rate_available: false,
        service_incident: false,
        incident_classification_complete: true,
      },
    ],
  ])
  expect(screen.getByText('—')).toBeVisible()
  expect(
    screen.getByText('No request success-rate data available')
  ).toBeVisible()
  expect(screen.queryByText('0.00%')).not.toBeInTheDocument()
  expect(screen.queryByText('100.00%')).not.toBeInTheDocument()
})

test('detail success rate uses the backend model summary rather than averaging group percentages', async () => {
  await renderPerformance(
    [[{ ...point, success_rate: 100 }], [{ ...point, success_rate: 0 }]],
    90
  )
  expect(screen.getByText('90.00%')).toBeVisible()
  expect(screen.queryByText('50.00%')).not.toBeInTheDocument()
})
