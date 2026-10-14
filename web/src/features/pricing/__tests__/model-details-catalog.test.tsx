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
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { afterEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { ModelDetailsContent } from '../components/model-details'
import type { PricingModel } from '../types'

vi.mock('@visactor/react-vchart', () => ({ VChart: () => null }))

const clients: QueryClient[] = []
const catalogModel: PricingModel = {
  id: 11,
  model_name: 'provider/catalog-model',
  display_name: 'Catalog Model',
  description: 'Catalog model description',
  quota_type: 0,
  model_ratio: 99,
  completion_ratio: 99,
  enable_groups: ['default'],
  context_length: 128000,
  max_output_tokens: 8000,
  input_modalities: ['text', 'image'],
  output_modalities: ['text'],
  capabilities: ['streaming', 'vision'],
  supported_endpoint_types: ['openai'],
  pricing_status: 'pending',
  catalog_source: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/provider/catalog-model',
    checked_at: '2026-10-08',
  },
}

afterEach(async () => {
  cleanup()
  vi.unstubAllEnvs()
  clients.forEach((client) => client.clear())
  clients.length = 0
  i18next.removeResourceBundle('zh', 'translation')
  await i18next.changeLanguage('en')
})

function renderDetails(
  model: PricingModel = catalogModel,
  status: Record<string, unknown> = {}
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  client.setQueryData(['status'], status)
  render(
    <QueryClientProvider client={client}>
      <ModelDetailsContent
        model={model}
        groupRatio={{ default: 2 }}
        usableGroup={{ default: { desc: '', ratio: 2 } }}
        endpointMap={{
          openai: { path: '/v1/chat/completions', method: 'POST' },
        }}
        autoGroups={[]}
        priceRate={1}
        usdExchangeRate={1}
        tokenUnit='K'
      />
    </QueryClientProvider>
  )
}

test('a catalog model displays its readable name and copies the canonical model ID', async () => {
  const user = userEvent.setup()
  renderDetails()

  expect(screen.getByRole('heading', { name: 'Catalog Model' })).toBeVisible()
  expect(screen.getByText('provider/catalog-model')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Copy model name' }))
  expect(await navigator.clipboard.readText()).toBe('provider/catalog-model')
  expect(screen.queryByText('Catalog source')).not.toBeInTheDocument()
  expect(screen.queryByText('OpenRouter')).not.toBeInTheDocument()
  expect(screen.queryByText('Checked on 2026-10-08')).not.toBeInTheDocument()
})

test('coming-soon details disclose availability and unpublished prices without requesting performance', async () => {
  const request = vi
    .spyOn(api, 'get')
    .mockResolvedValue({ data: { data: { groups: [] } } })
  const user = userEvent.setup()
  renderDetails({
    ...catalogModel,
    availability: 'coming_soon',
    enable_groups: [],
  })

  expect(screen.getByText('Coming soon')).toBeVisible()
  expect(
    screen.getByText(
      'This model is coming soon and is not available for inference yet.'
    )
  ).toBeVisible()
  const pricing = screen.getByRole('region', { name: 'Pricing' })
  expect(within(pricing).getByText('Pricing will be announced')).toBeVisible()
  expect(within(pricing).queryByText(/[$¥€]/)).not.toBeInTheDocument()
  expect(screen.queryByText('To be configured')).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Performance' }))
  expect(screen.getByText('No performance data yet')).toBeVisible()
  expect(request).not.toHaveBeenCalled()
})

test('coming-soon API details explain unavailability instead of offering callable examples', async () => {
  const user = userEvent.setup()
  renderDetails({
    ...catalogModel,
    availability: 'coming_soon',
    official_price: { input: 1.4, output: 4.4 },
    enable_groups: [],
  })
  expect(screen.getByText('Coming soon')).toBeVisible()
  const pricing = within(screen.getByRole('region', { name: 'Pricing' }))
  expect(pricing.getByText('1.12')).toBeVisible()
  expect(pricing.getByText('3.52')).toBeVisible()
  expect(pricing.getByText('20% off')).toBeVisible()
  expect(pricing.queryByText('Pricing by Group')).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'API' }))

  const panel = screen.getByRole('tabpanel', { name: 'API' })
  expect(panel).toHaveTextContent(
    'This model is coming soon and is not available for inference yet.'
  )
  expect(
    within(panel).queryByRole('heading', { name: 'Code samples' })
  ).not.toBeInTheDocument()
  expect(
    within(panel).queryByRole('heading', { name: 'Authentication' })
  ).not.toBeInTheDocument()
  expect(
    within(panel).queryByRole('button', { name: /copy/i })
  ).not.toBeInTheDocument()
  expect(panel).not.toHaveTextContent('/v1/chat/completions')
})

test('pending pricing cannot show calculated amounts or group prices, and makes no performance request', async () => {
  const request = vi
    .spyOn(api, 'get')
    .mockResolvedValue({ data: { data: { groups: [] } } })
  const user = userEvent.setup()
  renderDetails()

  const pricing = screen.getByRole('region', { name: 'Pricing' })
  expect(within(pricing).getAllByText('To be configured')).toHaveLength(2)
  expect(within(pricing).getByText('Input')).toBeVisible()
  expect(within(pricing).getByText('Output')).toBeVisible()
  expect(within(pricing).getByText('Per 1M tokens')).toBeVisible()
  expect(within(pricing).queryByText(/[$¥€]/)).not.toBeInTheDocument()
  expect(
    within(pricing).queryByText('Pricing by Group')
  ).not.toBeInTheDocument()
  expect(screen.getByText('128.0K')).toBeVisible()
  expect(screen.getByText('8.0K')).toBeVisible()
  await user.click(screen.getByRole('tab', { name: 'Performance' }))
  expect(screen.getByText('No performance data yet')).toBeVisible()
  expect(request).not.toHaveBeenCalled()
})

test('configured models retain their real price display and raw-name fallback', () => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { data: { groups: [] } } })
  renderDetails({
    ...catalogModel,
    display_name: undefined,
    pricing_status: undefined,
    catalog_source: undefined,
  })

  expect(
    screen.getByRole('heading', { name: 'provider/catalog-model' })
  ).toBeVisible()
  expect(screen.getByText('Pricing by Group')).toBeVisible()
  expect(screen.queryByText('To be configured')).not.toBeInTheDocument()
  expect(screen.getAllByText(/\$/).length).toBeGreaterThan(0)
})

test('catalog descriptions update when the interface language changes', async () => {
  renderDetails()
  i18next.addResourceBundle('zh', 'translation', {
    'Catalog model description': '模型简介',
  })
  await act(() => i18next.changeLanguage('zh'))

  expect(screen.getByText('模型简介')).toBeVisible()
  expect(
    screen.queryByText('Catalog model description')
  ).not.toBeInTheDocument()
})

test('pending API documentation shows examples without inferred parameter or rate-limit claims', async () => {
  const user = userEvent.setup()
  renderDetails()
  await user.click(screen.getByRole('tab', { name: 'API' }))

  expect(screen.getByRole('heading', { name: 'Code samples' })).toBeVisible()
  expect(
    screen.getByText(
      'These API examples are integration references. Confirm the endpoint and model ID with your configured provider before making requests.'
    )
  ).toBeVisible()
  expect(
    screen.queryByRole('heading', { name: 'Supported parameters' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('heading', { name: 'Rate limits' })
  ).not.toBeInTheDocument()
})

test('configured API documentation does not publish generated rate limits or unverified parameter lists', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { data: { groups: [] } } })
  const user = userEvent.setup()
  renderDetails({ ...catalogModel, pricing_status: undefined })
  await user.click(screen.getByRole('tab', { name: 'API' }))

  expect(screen.getByRole('heading', { name: 'Code samples' })).toBeVisible()
  expect(
    screen.queryByRole('heading', { name: 'Supported parameters' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('heading', { name: 'Rate limits' })
  ).not.toBeInTheDocument()
})

test('a configured public API base overrides the shared backend address in model examples', async () => {
  vi.stubEnv('VITE_LLM_API_BASE_URL', 'https://llm.fluxion-sys.ai/v1')
  const user = userEvent.setup()
  renderDetails(catalogModel, { server_address: 'https://video.example.com' })
  await user.click(screen.getByRole('tab', { name: 'API' }))

  const panel = screen.getByRole('tabpanel', { name: 'API' })
  expect(panel).toHaveTextContent(
    'curl https://llm.fluxion-sys.ai/v1/chat/completions'
  )
  expect(panel).not.toHaveTextContent('https://video.example.com')
  expect(panel).not.toHaveTextContent('/v1/v1/')
})
