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
import { OFFICIAL_PRICE_DISCOUNT_PERCENT } from '../constants'
import { officialPrices } from '../lib/catalog'
import type { PricingModel, TokenUnit } from '../types'

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
  status: Record<string, unknown> = {},
  tokenUnit: TokenUnit = 'K',
  selectedGroup?: string
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
          gemini: {
            path: '/v1beta/models/{model}:generateContent',
            method: 'POST',
          },
        }}
        autoGroups={[]}
        priceRate={1}
        usdExchangeRate={1}
        tokenUnit={tokenUnit}
        selectedGroup={selectedGroup}
      />
    </QueryClientProvider>
  )
}

test('a catalog model displays its readable name and copies the canonical model ID', async () => {
  const user = userEvent.setup()
  renderDetails()

  expect(screen.getByRole('heading', { name: 'Catalog Model' })).toBeVisible()
  expect(screen.getByText('provider/catalog-model')).toBeVisible()
  expect(screen.queryByText('Groups')).not.toBeInTheDocument()
  expect(screen.queryByText('default')).not.toBeInTheDocument()
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

  expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
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
    official_price: officialPrices['glm-5.3'],
    enable_groups: [],
  })
  expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
  const pricing = within(screen.getByRole('region', { name: 'Pricing' }))
  expect(pricing.getByText('Input')).toBeVisible()
  expect(pricing.getByText('Output')).toBeVisible()
  const amounts = pricing.getAllByText(/^[\d,]+\.\d+$/)
  expect(amounts).toHaveLength(6)
  for (const amount of amounts) expect(amount).toBeVisible()
  expect(
    pricing.getByText(`${OFFICIAL_PRICE_DISCOUNT_PERCENT}% off`)
  ).toBeVisible()
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
  expect(screen.getByText('125K')).toBeVisible()
  expect(screen.getByText('7.8K')).toBeVisible()
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
  expect(screen.getByText('Endpoints')).toBeVisible()
  expect(screen.getByText('openai')).toBeVisible()
  expect(screen.queryByText('Pricing by Group')).not.toBeInTheDocument()
  expect(screen.queryByText('Groups')).not.toBeInTheDocument()
  expect(screen.queryByText('default')).not.toBeInTheDocument()
  expect(screen.queryByText('To be configured')).not.toBeInTheDocument()
  expect(screen.getAllByText(/\$/).length).toBeGreaterThan(0)
})

test('connected model details show backend expression prices without an unsupported reference discount', () => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { data: { groups: [] } } })
  renderDetails(
    {
      ...catalogModel,
      pricing_status: undefined,
      official_price: officialPrices['deepseek-v4.1-flash'],
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("standard", p * 7 + c * 21)',
    },
    {},
    'M'
  )

  const pricing = within(screen.getByRole('region', { name: 'Pricing' }))
  expect(pricing.getByText('7.00')).toBeVisible()
  expect(pricing.getByText('21.00')).toBeVisible()
  expect(pricing.queryByText('20% off')).not.toBeInTheDocument()
  expect(pricing.queryByText('Pricing by Group')).not.toBeInTheDocument()
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

test('model examples keep the Fluxion domain despite legacy deployment overrides', async () => {
  vi.stubEnv('VITE_LLM_API_BASE_URL', 'http://192.0.2.20:3000/v1')
  const user = userEvent.setup()
  renderDetails(catalogModel, { server_address: 'https://video.example.com' })
  await user.click(screen.getByRole('tab', { name: 'API' }))

  const panel = screen.getByRole('tabpanel', { name: 'API' })
  expect(panel).toHaveTextContent(
    'curl https://api.fluxion-sys.ai/v1/chat/completions'
  )
  expect(panel).not.toHaveTextContent('https://video.example.com')
  expect(panel).not.toHaveTextContent('/v1/v1/')
})

test('model API examples use the Fluxion domain when the backend advertises an IP address', async () => {
  vi.stubEnv('VITE_LLM_API_BASE_URL', '')
  const user = userEvent.setup()
  renderDetails(catalogModel, { server_address: 'http://192.0.2.10:3000' })
  await user.click(screen.getByRole('tab', { name: 'API' }))

  const panel = screen.getByRole('tabpanel', { name: 'API' })
  expect(panel).toHaveTextContent(
    'curl https://api.fluxion-sys.ai/v1/chat/completions'
  )
  expect(panel).not.toHaveTextContent('192.0.2.10')

  await user.click(within(panel).getByRole('tab', { name: 'Python' }))
  expect(panel).toHaveTextContent('base_url="https://api.fluxion-sys.ai/v1"')
  expect(panel).not.toHaveTextContent('192.0.2.10')

  await user.click(within(panel).getByRole('tab', { name: 'TypeScript' }))
  expect(panel).toHaveTextContent("baseURL: 'https://api.fluxion-sys.ai/v1'")

  await user.click(within(panel).getByRole('tab', { name: 'JavaScript' }))
  expect(panel).toHaveTextContent(
    "fetch('https://api.fluxion-sys.ai/v1/chat/completions'"
  )
  await user.click(within(panel).getByRole('button', { name: 'Copy code' }))
  expect(await navigator.clipboard.readText()).toContain(
    'https://api.fluxion-sys.ai/v1/chat/completions'
  )
  expect(panel).not.toHaveTextContent('192.0.2.10')
  expect(panel).not.toHaveTextContent('/v1/v1/')
})

test('Gemini examples in every language use the Fluxion endpoint and API key header', async () => {
  const user = userEvent.setup()
  renderDetails({
    ...catalogModel,
    model_name: 'gemini-2.5-flash',
    supported_endpoint_types: ['openai', 'gemini'],
  })
  await user.click(screen.getByRole('tab', { name: 'API' }))
  const panel = screen.getByRole('tabpanel', { name: 'API' })
  await user.click(within(panel).getByRole('tab', { name: 'gemini' }))
  const endpoint =
    'https://api.fluxion-sys.ai/v1beta/models/gemini-2.5-flash:generateContent'

  expect(panel).toHaveTextContent(endpoint)
  expect(panel).toHaveTextContent('-H "x-goog-api-key: $FLUXION_API_KEY"')

  await user.click(within(panel).getByRole('tab', { name: 'Python' }))
  expect(panel).toHaveTextContent(endpoint)
  expect(panel).toHaveTextContent(
    '"x-goog-api-key": os.environ["FLUXION_API_KEY"]'
  )

  for (const language of ['TypeScript', 'JavaScript']) {
    await user.click(within(panel).getByRole('tab', { name: language }))
    expect(panel).toHaveTextContent(`fetch('${endpoint}'`)
    expect(panel).toHaveTextContent(
      "'x-goog-api-key': process.env.FLUXION_API_KEY"
    )
    await user.click(
      within(panel).getByRole('button', { name: /^(Copy code|Copied!)$/ })
    )
    const copied = await navigator.clipboard.readText()
    expect(copied).toContain(endpoint)
    expect(copied).toContain("'x-goog-api-key': process.env.FLUXION_API_KEY")
    expect(copied).not.toContain('?key=')
  }
})

test('connected GLM details display the backend discounted input, cache and output rates', () => {
  renderDetails(
    {
      ...catalogModel,
      model_name: 'GLM-5.3',
      pricing_status: undefined,
      official_price: officialPrices['glm-5.3'],
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("standard", p * 1.12 + cr * 0.208 + c * 3.52)',
      group_ratio: { default: 1 },
    },
    {},
    'M'
  )
  const pricing = within(screen.getByRole('region', { name: 'Pricing' }))
  expect(pricing.getByText('1.12')).toBeVisible()
  expect(pricing.getByText('0.208')).toBeVisible()
  expect(pricing.getByText('3.52')).toBeVisible()
  expect(pricing.getByText('20% off')).toBeVisible()
})

test('GLM details preserve the selected group price from the catalog', () => {
  renderDetails(
    {
      ...catalogModel,
      model_name: 'GLM-5.3',
      pricing_status: undefined,
      official_price: officialPrices['glm-5.3'],
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("standard", p * 1.12 + cr * 0.208 + c * 3.52)',
      enable_groups: ['default', 'vip'],
      group_ratio: { default: 1, vip: 2 },
    },
    {},
    'M',
    'vip'
  )
  const pricing = within(screen.getByRole('region', { name: 'Pricing' }))
  expect(pricing.getByText('2.24')).toBeVisible()
  expect(pricing.getByText('0.416')).toBeVisible()
  expect(pricing.getByText('7.04')).toBeVisible()
  expect(pricing.queryByText('20% off')).not.toBeInTheDocument()
})

test.each([
  { available: true, expected: '90.00%' },
  { available: false, expected: '—' },
])(
  'Overview uses model summary availability $available instead of a group average',
  async ({ available, expected }) => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/api/model-service-status') {
        return {
          data: {
            success: true,
            data: {
              models: [
                { model_name: catalogModel.model_name, status: 'available' },
              ],
            },
          },
        }
      }
      return {
        data: {
          success: true,
          data:
            url === '/api/perf-metrics/summary'
              ? {
                  models: [
                    {
                      model_name: catalogModel.model_name,
                      success_rate: 90,
                      success_rate_available: available,
                    },
                  ],
                }
              : {
                  groups: [
                    {
                      group: 'a',
                      success_rate: 100,
                      avg_latency_ms: 500,
                      avg_tps: 40,
                      series: [],
                    },
                    {
                      group: 'b',
                      success_rate: 0,
                      avg_latency_ms: 500,
                      avg_tps: 40,
                      series: [],
                    },
                  ],
                },
        },
      }
    })
    renderDetails({ ...catalogModel, pricing_status: undefined })
    expect(await screen.findByText('40.0 t/s')).toBeVisible()
    expect(screen.getByText(expected)).toBeVisible()
    expect(screen.queryByText('50.00%')).not.toBeInTheDocument()
  }
)

test('a paused model shows unavailable while Performance preserves its historical failures', async () => {
  const user = userEvent.setup()
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/model-service-status') {
      return {
        data: {
          success: true,
          data: {
            models: [
              { model_name: catalogModel.model_name, status: 'unavailable' },
            ],
          },
        },
      }
    }
    const sample = {
      ts: Math.floor(Date.now() / 1000),
      avg_ttft_ms: 400,
      avg_latency_ms: 1200,
      avg_tps: 40,
      success_rate: 0,
      success_rate_available: true,
      service_incident: true,
      incident_classification_complete: true,
    }
    if (url === '/api/perf-metrics/summary') {
      return {
        data: {
          success: true,
          data: {
            models: [
              {
                ...sample,
                model_name: catalogModel.model_name,
                recent_success_series: [sample],
              },
            ],
          },
        },
      }
    }
    return {
      data: {
        success: true,
        data: {
          model_name: catalogModel.model_name,
          groups: [{ ...sample, group: 'default', series: [sample] }],
        },
      },
    }
  })
  renderDetails({ ...catalogModel, pricing_status: undefined })
  expect(await screen.findByText(/Temporarily unavailable/)).toBeVisible()
  expect(screen.queryByText('0.00%')).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Performance' }))
  expect(await screen.findByText('0.00%')).toBeVisible()
  expect(
    screen.getByText('Time buckets with confirmed service incidents: 1')
  ).toBeVisible()
})
