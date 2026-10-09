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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ConsumptionDistributionChart } from '../consumption-distribution-chart'
import { ModelCharts } from '../model-charts'

// Canvas rendering belongs to VChart; exercise the surrounding controls and states.
vi.mock('@visactor/react-vchart', () => ({
  VChart: () => <div role='img' aria-label='Usage chart' />,
}))
vi.mock('@visactor/vchart', () => ({
  ThemeManager: { setCurrentTheme: vi.fn() },
}))

const requestData = [
  {
    model_name: 'example-model',
    created_at: 1791514800,
    count: 2,
    quota: 100,
    token_used: 200,
  },
]

describe('dashboard chart states', () => {
  it.each([
    ['model calls', ModelCharts],
    ['consumption', ConsumptionDistributionChart],
  ] as const)(
    'shows an explanation instead of a blank %s chart when the period has no usage',
    async (_name, Chart) => {
      render(<Chart data={[]} />)

      await waitFor(() =>
        expect(screen.getByText('No usage in this period')).toBeVisible()
      )
      expect(
        screen.getByText(
          'Try another time range or send an API request to get started.'
        )
      ).toBeVisible()
      expect(
        screen.queryByRole('img', { name: 'Usage chart' })
      ).not.toBeInTheDocument()
    }
  )

  it('keeps the loading state distinct from an empty consumption period', async () => {
    const view = render(<ConsumptionDistributionChart data={[]} loading />)

    expect(screen.getByText('Loading...')).toBeVisible()
    expect(
      screen.queryByText('No usage in this period')
    ).not.toBeInTheDocument()

    view.rerender(<ConsumptionDistributionChart data={requestData} />)
    expect(
      await screen.findByRole('img', { name: 'Usage chart' })
    ).toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('allows keyboard selection of the model chart type', async () => {
    const user = userEvent.setup()
    render(<ModelCharts data={requestData} />)
    await screen.findByRole('img', { name: 'Usage chart' })

    const trend = screen.getByRole('tab', { name: 'Call Trend' })
    expect(trend).toHaveAttribute('aria-selected', 'true')
    await user.click(trend)
    await user.keyboard('{ArrowRight}{Enter}')

    expect(
      screen.getByRole('tab', { name: 'Call Count Distribution' })
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('retains the selected consumption chart when switching to an empty period', async () => {
    const user = userEvent.setup()
    const view = render(<ConsumptionDistributionChart data={requestData} />)
    await screen.findByRole('img', { name: 'Usage chart' })
    await user.click(screen.getByRole('tab', { name: 'Area Chart' }))

    view.rerender(<ConsumptionDistributionChart data={[]} />)

    await waitFor(() =>
      expect(screen.getByText('No usage in this period')).toBeVisible()
    )
    expect(screen.getByRole('tab', { name: 'Area Chart' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })
})
