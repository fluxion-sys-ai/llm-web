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
  cleanup,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, test } from 'vitest'

import { ModelCard } from '../components/model-card'
import { ModelPriceCell } from '../components/model-price-cell'
import { useLlmCatalog } from '../hooks/use-llm-catalog'
import { buildLlmCatalog } from '../lib/catalog'
import { getDynamicPricingSummary } from '../lib/dynamic-price'
import type { PricingData, PricingModel } from '../types'

const clients: QueryClient[] = []
const glm: PricingModel = {
  id: 1,
  model_name: 'GLM-5.3',
  quota_type: 0,
  model_ratio: 1.2,
  completion_ratio: 3,
  cache_ratio: 0.25,
  enable_groups: ['default'],
  supported_endpoint_types: ['openai'],
}
const deepseek: PricingModel = {
  ...glm,
  id: 2,
  model_name: 'DeepSeek-V4.1-Flash',
}

function catalog(data: PricingModel[], extra: Partial<PricingData> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  clients.push(client)
  client.setQueryData(['status'], {})
  client.setQueryData(['pricing'], {
    success: true,
    data,
    group_ratio: { default: 1.5 },
    usable_group: {},
    supported_endpoint: {},
    auto_groups: [],
    ...extra,
  })
  return renderHook(() => useLlmCatalog(), {
    wrapper: (props: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        {props.children}
      </QueryClientProvider>
    ),
  }).result
}

afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
})

test('real backend IDs keep their prices and receive display metadata when vendors are omitted', () => {
  const result = catalog([glm, deepseek])

  expect(result.current.models).toHaveLength(3)
  expect(result.current.models[0]).toMatchObject({
    ...glm,
    display_name: 'GLM 5.3',
    vendor_name: 'Z.ai',
    icon: 'ZAI',
    group_ratio: { default: 1.5 },
  })
  expect(result.current.models[1]).toMatchObject({
    ...deepseek,
    display_name: 'DeepSeek V4.1 Flash',
    vendor_name: 'DeepSeek',
    icon: 'DeepSeek.Color',
  })
  expect(result.current.models[0].description).toBeTruthy()
  expect(result.current.models[0].pricing_status).toBeUndefined()
  expect(result.current.vendors.map((vendor) => vendor.name)).toEqual([
    'Z.ai',
    'DeepSeek',
    'Moonshot AI',
  ])
})

test('backend display and billing fields win over local metadata without rewriting the customer model ID', () => {
  const model = {
    ...glm,
    display_name: 'Configured GLM',
    description: 'Configured description',
    icon: 'OpenAI',
    vendor_id: 99,
    featured: false,
    billing_mode: 'tiered_expr',
    billing_expr: 'configured-price',
    supported_endpoint_types: ['anthropic'],
  }
  const result = catalog([model], {
    vendors: [{ id: 99, name: 'Configured developer', icon: 'OpenAI' }],
  })

  expect(result.current.models[0]).toMatchObject({
    ...model,
    vendor_name: 'Configured developer',
    vendor_icon: 'OpenAI',
  })
  expect(result.current.models[0].capabilities).toBeUndefined()
  expect(result.current.models[0].max_output_tokens).toBeUndefined()
})

test('production DeepSeek expression prices override the legacy 37.5 ratio in catalog display', () => {
  const result = catalog(
    [
      {
        ...deepseek,
        vendor_id: -1005,
        model_ratio: 37.5,
        model_price: 0,
        completion_ratio: 1,
        cache_ratio: undefined,
        billing_mode: 'tiered_expr',
        billing_expr: 'tier("standard", p * 0.3 + cr * 0.006 + c * 1.2)',
      },
    ],
    { group_ratio: { default: 1, vip: 1 } }
  )
  const model = result.current.models[0]
  const summary = getDynamicPricingSummary(model, { tokenUnit: 'M' })

  expect(summary?.isSpecialExpression).toBe(false)
  expect(summary?.primaryEntries.map((entry) => entry.value)).toEqual([
    0.3, 1.2,
  ])
  expect(summary?.secondaryEntries.map((entry) => entry.value)).toEqual([0.006])
  render(<ModelPriceCell model={model} options={{ tokenUnit: 'M' }} />)
  expect(screen.getByText('0.3')).toBeVisible()
  expect(screen.getByText('1.2')).toBeVisible()
  expect(screen.queryByText(/75/)).not.toBeInTheDocument()
})

test('video and image generation models stay out while backend-confirmed text models remain available', () => {
  const unknownChat: PricingModel = {
    ...glm,
    id: 3,
    model_name: 'custom-chat-model',
    output_modalities: ['text'],
  }
  const video = {
    ...glm,
    id: 4,
    model_name: 'video-model',
    supported_endpoint_types: ['openai-video'],
  }
  const image = {
    ...glm,
    id: 5,
    model_name: 'image-model',
    supported_endpoint_types: ['image-generation'],
  }
  const videoWithChatEndpoint = {
    ...glm,
    id: 6,
    model_name: 'video-via-chat',
    output_modalities: ['video'] as const,
  }
  const result = catalog(
    [
      glm,
      unknownChat,
      video,
      image,
      {
        ...videoWithChatEndpoint,
        output_modalities: [...videoWithChatEndpoint.output_modalities],
      },
    ],
    { vendors: [] }
  )

  expect(result.current.models.map((model) => model.model_name)).toEqual([
    'GLM-5.3',
    'custom-chat-model',
    'DeepSeek-V4.1-Flash',
    'Kimi-K3',
  ])
})

test('legacy OpenAI token pricing without modality metadata does not publish unverified models', () => {
  const legacyModels = [
    'Wan-3.0',
    'Seedance-2.0',
    'Seedance-2.0-Fast',
    'Seedance-2.0-Mini',
    'Seedance-2.5',
    'MiniMax-H3',
    'MiniMax-H3-Fast',
    'MiniMax-H3-UltraFast',
  ].map((model_name, index) => ({
    ...glm,
    id: index + 3,
    model_name,
    model_ratio: 37.5,
    completion_ratio: 1,
    model_price: 0,
  }))
  const result = catalog([glm, ...legacyModels, deepseek])

  expect(result.current.models.map((model) => model.model_name)).toEqual([
    'GLM-5.3',
    'DeepSeek-V4.1-Flash',
    'Kimi-K3',
  ])
})

test('a successful empty catalog announces the planned models without callable groups or specifications', () => {
  const result = catalog([], { vendors: [] })
  expect(result.current.models.map((model) => model.model_name)).toEqual([
    'GLM-5.3',
    'DeepSeek-V4.1-Flash',
    'Kimi-K3',
  ])
  for (const model of result.current.models) {
    expect(model).toMatchObject({
      availability: 'coming_soon',
      pricing_status: 'pending',
      enable_groups: [],
    })
    expect(model.context_length).toBeUndefined()
    expect(model.max_output_tokens).toBeUndefined()
    expect(model.capabilities).toBeUndefined()
    expect(model.billing_expr).toBeUndefined()
    expect(model.supported_endpoint_types).toBeUndefined()
  }
  expect(result.current.vendors.map((vendor) => vendor.name)).toEqual([
    'Z.ai',
    'DeepSeek',
    'Moonshot AI',
  ])
  expect(result.current.models[2]).toMatchObject({
    display_name: 'Kimi K3',
    vendor_name: 'Moonshot AI',
    icon: 'Kimi.Avatar',
  })
  expect(result.current.models[2].description).toBe(
    'This model is coming soon and is not available for inference yet.'
  )
})

test('announced models carry their vendor-published official price', () => {
  const result = catalog([], { vendors: [] })
  expect(result.current.models.map((model) => model.official_price)).toEqual([
    { input: 1.4, output: 4.4 },
    { input: 0.3, output: 1.2 },
    { input: 3, output: 15 },
  ])
})

test.each([
  ['GLM-5.3', '1.12', '3.52', '1.40', '4.40'],
  ['DeepSeek-V4.1-Flash', '0.24', '0.96', '0.30', '1.20'],
  ['Kimi-K3', '2.40', '12.00', '3.00', '15.00'],
])(
  'a video-only backend still shows announced prices for %s with Coming soon',
  (name, input, output, originalInput, originalOutput) => {
    const result = catalog([{ ...glm, model_name: 'Wan-3.0' }])
    const model = result.current.models.find(
      (model) => model.model_name === name
    )
    if (!model) throw new Error(`Expected an announcement for ${name}`)
    render(<ModelCard model={model} onClick={() => {}} />)

    expect(screen.getByText('Coming soon')).toBeVisible()
    const pricing = within(screen.getByRole('group', { name: 'Pricing' }))
    expect(pricing.getByText(input)).toBeVisible()
    expect(pricing.getByText(output)).toBeVisible()
    expect(pricing.getByText(originalInput).tagName).toBe('S')
    expect(pricing.getByText(originalOutput).tagName).toBe('S')
    expect(pricing.getByText('20% off')).toBeVisible()
    expect(
      pricing.queryByText('Pricing will be announced')
    ).not.toBeInTheDocument()
    expect(model.enable_groups).toEqual([])
    expect(
      screen.queryByLabelText('Performance metrics for the last 24 hours')
    ).not.toBeInTheDocument()
  }
)

test('backend models replace announcements and deduplicate case-insensitive IDs without changing live fields', () => {
  const configured = { ...deepseek, model_name: 'deepseek-v4.1-flash' }
  const configuredKimi = { ...glm, id: 3, model_name: 'kimi-k3' }
  const result = catalog([
    configured,
    deepseek,
    configuredKimi,
    { ...configuredKimi, model_name: 'Kimi-K3' },
  ])

  expect(result.current.models.map((model) => model.model_name)).toEqual([
    'deepseek-v4.1-flash',
    'kimi-k3',
    'GLM-5.3',
  ])
  expect(result.current.models[0]).toMatchObject(configured)
  expect(result.current.models[0].availability).toBeUndefined()
  expect(result.current.models[0].pricing_status).toBeUndefined()
  expect(result.current.models[1]).toMatchObject(configuredKimi)
  expect(result.current.models[1].availability).toBeUndefined()
  expect(result.current.models[1].pricing_status).toBeUndefined()
  expect(result.current.models[2].availability).toBe('coming_soon')
})

test('missing or unsuccessful backend responses never turn into announced catalog success', () => {
  expect(buildLlmCatalog()).toEqual({ models: [], vendors: [] })
  const result = catalog([], { success: false, vendors: [] })
  expect(result.current.models).toEqual([])
  expect(result.current.vendors).toEqual([])
})

test('lowercase preview IDs keep pending prices and supplied capabilities', () => {
  const preview = {
    ...glm,
    model_name: 'glm-5.3',
    model_ratio: 0,
    completion_ratio: 0,
    pricing_status: 'pending' as const,
    capabilities: ['reasoning'] as const,
    context_length: 1048576,
  }
  const result = catalog(
    [{ ...preview, capabilities: [...preview.capabilities] }],
    { vendors: [] }
  )
  expect(result.current.models[0]).toMatchObject({
    ...preview,
    display_name: 'GLM 5.3',
  })
})
